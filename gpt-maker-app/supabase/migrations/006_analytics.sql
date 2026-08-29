-- Fase 6: Analytics, Rate Limiting, Admin Dashboard
-- Includes creator leaderboard, API rate limiting, admin functions, and export/import support

-- ============= RATE LIMITING =============
create table rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  tier text not null default 'free',
  api_calls_today int not null default 0,
  reset_at timestamp not null default (now() + interval '1 day'),
  created_at timestamp not null default now()
);

create unique index idx_rate_limits_user_id on rate_limits(user_id);
create index idx_rate_limits_reset_at on rate_limits(reset_at);

alter table rate_limits enable row level security;

create policy "users_see_own_rate_limits" on rate_limits
  for select
  using (auth.uid() = user_id);

-- RPC: Check and increment rate limit
create or replace function check_and_increment_rate_limit(p_user_id uuid, p_tier text)
returns boolean as $$
declare
  v_limit int := 100;
  v_current_calls int;
  v_today_start timestamp := date_trunc('day', now());
  v_reset_at timestamp;
begin
  if p_tier = 'premium' then v_limit := 10000; end if;

  select api_calls_today, reset_at into v_current_calls, v_reset_at
  from rate_limits
  where user_id = p_user_id;

  if not found then
    insert into rate_limits (user_id, tier, api_calls_today, reset_at)
    values (p_user_id, p_tier, 1, v_today_start + interval '1 day');
    return true;
  end if;

  if now() > v_reset_at then
    update rate_limits
    set api_calls_today = 1, reset_at = now() + interval '1 day'
    where user_id = p_user_id;
    return true;
  end if;

  if v_current_calls >= v_limit then
    return false;
  end if;

  update rate_limits
  set api_calls_today = api_calls_today + 1
  where user_id = p_user_id;
  return true;
end;
$$ language plpgsql security definer;

grant execute on function check_and_increment_rate_limit to authenticated;

-- ============= CREATOR LEADERBOARD & ANALYTICS =============

-- RPC: Get leaderboard by sort (rating, downloads, trending)
create or replace function get_leaderboard(p_sort_by text default 'rating', p_limit int default 50)
returns table (
  owner_id uuid,
  display_name text,
  avatar_url text,
  bot_count bigint,
  total_conversations bigint,
  rating_avg numeric,
  top_bot_name text
) as $$
begin
  if p_sort_by = 'downloads' then
    return query
      select
        p.id,
        p.display_name,
        p.avatar_url,
        count(distinct b.id)::bigint,
        coalesce(sum(b.total_conversations), 0)::bigint,
        coalesce(avg(b.rating_avg), 0)::numeric,
        (array_agg(b.name order by b.total_conversations desc))[1]
      from profiles p
      left join bots b on p.id = b.owner_id and b.is_published = true
      group by p.id
      order by coalesce(sum(b.total_conversations), 0) desc
      limit p_limit;
  elsif p_sort_by = 'trending' then
    return query
      select
        p.id,
        p.display_name,
        p.avatar_url,
        count(distinct b.id)::bigint,
        coalesce(sum(c.id is not null), 0)::bigint,
        coalesce(avg(b.rating_avg), 0)::numeric,
        (array_agg(b.name order by count(c.id) desc))[1]
      from profiles p
      left join bots b on p.id = b.owner_id and b.is_published = true
      left join conversations c on b.id = c.bot_id and c.created_at > now() - interval '7 days'
      group by p.id
      order by count(c.id) desc
      limit p_limit;
  else -- default: rating
    return query
      select
        p.id,
        p.display_name,
        p.avatar_url,
        count(distinct b.id)::bigint,
        coalesce(sum(b.total_conversations), 0)::bigint,
        coalesce(avg(b.rating_avg), 0)::numeric,
        (array_agg(b.name order by b.rating_avg desc))[1]
      from profiles p
      left join bots b on p.id = b.owner_id and b.is_published = true
      group by p.id
      having coalesce(avg(b.rating_avg), 0) > 0
      order by coalesce(avg(b.rating_avg), 0) desc, coalesce(sum(b.total_conversations), 0) desc
      limit p_limit;
  end if;
end;
$$ language plpgsql stable;

grant execute on function get_leaderboard to anon;

-- RPC: Get trending creators (last N days)
create or replace function get_trending_creators(p_days int default 7)
returns table (
  owner_id uuid,
  display_name text,
  avatar_url text,
  new_conversations int,
  new_ratings int
) as $$
begin
  return query
    select
      p.id,
      p.display_name,
      p.avatar_url,
      count(distinct c.id)::int,
      count(distinct r.id)::int
    from profiles p
    left join bots b on p.id = b.owner_id and b.is_published = true
    left join conversations c on b.id = c.bot_id and c.created_at > now() - (p_days || ' days')::interval
    left join reviews r on b.id = (select bot_id from marketplace_listings where id = r.listing_id) and r.created_at > now() - (p_days || ' days')::interval
    group by p.id, p.display_name, p.avatar_url
    having count(distinct c.id) > 0 or count(distinct r.id) > 0
    order by count(distinct c.id) + count(distinct r.id) desc
    limit 20;
end;
$$ language plpgsql stable;

grant execute on function get_trending_creators to anon;

-- ============= ADMIN DASHBOARD =============

-- Add is_admin column to profiles
alter table profiles add column is_admin boolean default false;

-- RPC: Admin stats (global platform metrics)
create or replace function admin_stats()
returns table (
  total_bots bigint,
  total_users bigint,
  total_conversations bigint,
  avg_rating numeric
) as $$
begin
  return query
    select
      count(distinct b.id)::bigint,
      count(distinct u.id)::bigint,
      count(distinct c.id)::bigint,
      coalesce(avg(b.rating_avg), 0)::numeric
    from bots b
    full join auth.users u on true
    full join conversations c on c.bot_id = b.id;
end;
$$ language plpgsql stable security definer;

-- RPC: List pending abuse reports
create or replace function list_pending_reports(p_limit int default 20, p_offset int default 0)
returns table (
  id uuid,
  reporter_id uuid,
  target_type text,
  target_id uuid,
  reason text,
  details text,
  bot_name text,
  created_at timestamp
) as $$
begin
  return query
    select
      r.id,
      r.reporter_id,
      r.target_type,
      r.target_id,
      r.reason,
      r.details,
      b.name,
      r.created_at
    from reports r
    left join bots b on r.target_type = 'bot' and r.target_id = b.id
    where r.status = 'open'
    order by r.created_at desc
    limit p_limit
    offset p_offset;
end;
$$ language plpgsql stable security definer;

-- RPC: Dismiss abuse report
create or replace function admin_dismiss_report(p_report_id uuid)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  update reports
  set status = 'dismissed'
  where id = p_report_id;
end;
$$ language plpgsql security definer;

-- RPC: Ban bot (for moderation)
create or replace function admin_ban_bot(p_bot_id uuid, p_reason text)
returns void as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  update bots
  set is_public = false, is_published = false
  where id = p_bot_id;

  insert into reports (reporter_id, target_type, target_id, reason, status)
  values (auth.uid(), 'bot', p_bot_id, p_reason, 'reviewed');
end;
$$ language plpgsql security definer;

grant execute on function admin_stats to authenticated;
grant execute on function list_pending_reports to authenticated;
grant execute on function admin_dismiss_report to authenticated;
grant execute on function admin_ban_bot to authenticated;
