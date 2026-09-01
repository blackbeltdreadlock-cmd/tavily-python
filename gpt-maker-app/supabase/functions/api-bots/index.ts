// Supabase Edge Function: Public Bot API
// Exposes published bots via REST endpoints
//
// GET /functions/v1/api-bots — List published bots with pagination
// GET /functions/v1/api-bots/:id — Get bot details + top reviews
//
// Deploy: supabase functions deploy api-bots

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const botId = pathSegments[pathSegments.length - 1];

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    let userTier: string = 'free';

    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;

      if (userId) {
        // Get user tier
        const { data: rateLimit } = await supabase
          .from('rate_limits')
          .select('tier')
          .eq('user_id', userId)
          .single();

        userTier = rateLimit?.tier ?? 'free';

        // Check and increment rate limit
        const { data: limitOk, error: limitError } = await supabase.rpc(
          'check_and_increment_rate_limit',
          { p_user_id: userId, p_tier: userTier }
        );

        if (limitError || !limitOk) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Free tier: 100 calls/day, Premium: 10000 calls/day.' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
    }

    // GET /functions/v1/api-bots/:id
    if (botId && botId !== 'api-bots') {
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .select('id, owner_id, name, description, avatar_url, category, rating_avg, rating_count, total_conversations, total_messages, created_at')
        .eq('id', botId)
        .eq('is_published', true)
        .single();

      if (botError || !bot) {
        return new Response(JSON.stringify({ error: 'Bot not found' }), { status: 404 });
      }

      const { data: owner } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', bot.owner_id)
        .single();

      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, user:profiles(id, username, display_name)')
        .eq('listing_id', (await supabase.from('marketplace_listings').select('id').eq('bot_id', bot.id).single()).data?.id ?? null)
        .order('created_at', { ascending: false })
        .limit(5);

      return new Response(JSON.stringify({ bot: { ...bot, owner }, reviews: reviews ?? [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // GET /functions/v1/api-bots
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(url.searchParams.get('offset') ?? '0');
    const category = url.searchParams.get('category');
    const sort = url.searchParams.get('sort') ?? 'popular';

    let query = supabase
      .from('bots')
      .select('id, owner_id, name, description, avatar_url, category, rating_avg, rating_count, total_conversations, total_messages, created_at', { count: 'exact' })
      .eq('is_published', true);

    if (category) {
      query = query.eq('category', category);
    }

    if (sort === 'rating') {
      query = query.order('rating_avg', { ascending: false });
    } else if (sort === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else {
      // popular: order by total_conversations
      query = query.order('total_conversations', { ascending: false });
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ bots: data ?? [], total: count ?? 0, limit, offset }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
