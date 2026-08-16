// Supabase Edge Function: Chat with AI Bot
// Proxies requests to Claude API with bot-specific system prompts
//
// Deploy: supabase functions deploy chat --no-verify-jwt
// Env vars required: ANTHROPIC_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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

    // Fetch knowledge base for context
    const { data: knowledge } = await supabase
      .from('bot_knowledge')
      .select('title, content')
      .eq('bot_id', bot_id)
      .limit(5);

    let systemPrompt = bot.system_prompt;
    if (knowledge && knowledge.length > 0) {
      const knowledgeContext = knowledge
        .map((k: { title: string; content: string }) => `[${k.title}]\n${k.content}`)
        .join('\n\n');
      systemPrompt += `\n\nKnowledge Base:\n${knowledgeContext}`;
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

          // Update conversation
          await supabase
            .from('conversations')
            .update({
              message_count: (history?.length ?? 0) + 2,
              updated_at: new Date().toISOString(),
            })
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
