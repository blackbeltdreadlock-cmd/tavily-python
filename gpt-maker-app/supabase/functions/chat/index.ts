// Supabase Edge Function: Chat with AI Bot
// Proxies requests to Claude API with bot-specific system prompts
//
// Deploy: supabase functions deploy chat --no-verify-jwt
// Env vars required: ANTHROPIC_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/** How many ranked chunks to pull before the token budget trims them further. */
const KNOWLEDGE_CHUNK_LIMIT = 8;
/** Share of the bot's max_tokens that retrieved knowledge may occupy. */
const KNOWLEDGE_BUDGET_RATIO = 0.25;

interface KnowledgeChunk {
  title: string;
  content: string;
  tokens: number;
}

/** Mirrors estimateTokens in lib/knowledge.ts -- kept local since Edge Functions
 *  can't import from the app bundle. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { bot_id, conversation_id, message } = await req.json();
    if (!bot_id || !conversation_id || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Fetch bot config
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('system_prompt, model, temperature, max_tokens')
      .eq('id', bot_id)
      .single();

    if (botError || !bot) {
      return new Response(JSON.stringify({ error: 'Bot not found' }), { status: 404 });
    }

    // Fetch conversation history (last 20 messages)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Build messages array for Claude API
    const messages = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Retrieve the knowledge chunks that actually relate to this message,
    // ranked by Postgres full-text search rather than an arbitrary top-N.
    const { data: knowledge } = await supabase.rpc('search_bot_knowledge', {
      p_bot_id: bot_id,
      p_query: message,
      p_limit: KNOWLEDGE_CHUNK_LIMIT,
    });

    let systemPrompt = bot.system_prompt;

    if (knowledge && knowledge.length > 0) {
      // Cap retrieved context so a large knowledge base can't crowd out the
      // conversation itself.
      const budget = Math.floor((bot.max_tokens || 2048) * KNOWLEDGE_BUDGET_RATIO);
      const selected: string[] = [];
      let used = 0;

      for (const chunk of knowledge as KnowledgeChunk[]) {
        const cost = chunk.tokens || estimateTokens(chunk.content);
        if (used + cost > budget) break;
        selected.push(`[${chunk.title}]\n${chunk.content}`);
        used += cost;
      }

      if (selected.length > 0) {
        systemPrompt +=
          `\n\n## Base de conhecimento\n\n` +
          `Os trechos abaixo vieram dos documentos deste bot e foram selecionados ` +
          `por relevancia para a mensagem atual. Use-os quando responder e cite o ` +
          `titulo entre colchetes. Se a resposta nao estiver neles, diga que nao ` +
          `sabe em vez de inventar.\n\n${selected.join('\n\n---\n\n')}`;
      }
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
    }

    // Call Claude API with streaming
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: bot.model || 'claude-sonnet-4-20250514',
        max_tokens: bot.max_tokens || 2048,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `AI API error: ${error}` }), { status: 502 });
    }

    // Stream the response back via SSE
    const encoder = new TextEncoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    fullContent += parsed.delta.text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`),
                    );
                  }
                } catch {
                  // skip non-JSON lines
                }
              }
            }
          }

          // Save assistant message to database
          await supabase.from('messages').insert({
            conversation_id,
            role: 'assistant',
            content: fullContent,
          });

          // Bump updated_at so this conversation sorts to the top of the
          // history list and resumeOrCreateConversation picks it up.
          // message_count is owned by a trigger (migration 004) -- computing it
          // here produced a count derived from the truncated history window,
          // which froze at 22 once a conversation outgrew the window.
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversation_id);

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
