-- Fase 5.3: Push Notifications Support
-- Adds device token storage and notification triggers

-- Add push_tokens column to profiles
alter table profiles add column push_tokens text[] default array[]::text[];

-- RPC: Register or update device token
create or replace function register_device_token(p_token text)
returns void as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update profiles
  set push_tokens = array_append(push_tokens, p_token)
  where id = v_user_id
    and not (push_tokens @> array[p_token]);
end;
$$ language plpgsql security definer;

grant execute on function register_device_token to authenticated;

-- RPC: Unregister device token
create or replace function unregister_device_token(p_token text)
returns void as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update profiles
  set push_tokens = array_remove(push_tokens, p_token)
  where id = v_user_id;
end;
$$ language plpgsql security definer;

grant execute on function unregister_device_token to authenticated;

-- Fase 5.4: Bot Versioning
-- Stores history of bot configuration for rollback and A-B testing

create table bot_versions (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references bots on delete cascade,
  version_number int not null,
  system_prompt text not null,
  welcome_message text,
  model text not null,
  temperature float not null,
  max_tokens int not null,
  created_by uuid not null references auth.users on delete set null,
  created_at timestamp not null default now(),
  unique(bot_id, version_number)
);

create index idx_bot_versions_bot_id_desc on bot_versions(bot_id, version_number desc);

-- RLS: Only bot owner can see versions; public bots visible to all authenticated users
alter table bot_versions enable row level security;

create policy "bot_owner_see_all_versions" on bot_versions
  for select
  using (
    (select owner_id from bots where bots.id = bot_id) = auth.uid()
    or exists (select 1 from bots where bots.id = bot_id and is_public)
  );

create policy "owner_can_insert_versions" on bot_versions
  for insert
  with check ((select owner_id from bots where bots.id = bot_id) = auth.uid());

-- RPC: Create a new version (snapshot current config)
create or replace function create_bot_version(p_bot_id uuid)
returns bot_versions as $$
declare
  v_bot bots;
  v_next_version int;
  v_new_version bot_versions;
begin
  select * into v_bot from bots where id = p_bot_id;
  if not found then
    raise exception 'Bot not found';
  end if;

  if v_bot.owner_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_version from bot_versions where bot_id = p_bot_id;

  insert into bot_versions (bot_id, version_number, system_prompt, welcome_message, model, temperature, max_tokens, created_by)
  values (p_bot_id, v_next_version, v_bot.system_prompt, v_bot.welcome_message, v_bot.model, v_bot.temperature, v_bot.max_tokens, auth.uid())
  returning * into v_new_version;

  return v_new_version;
end;
$$ language plpgsql security definer;

grant execute on function create_bot_version to authenticated;

-- RPC: Rollback to a specific version
create or replace function rollback_to_version(p_bot_id uuid, p_version_number int)
returns bots as $$
declare
  v_version bot_versions;
  v_bot bots;
begin
  select * into v_version from bot_versions where bot_id = p_bot_id and version_number = p_version_number;
  if not found then
    raise exception 'Version not found';
  end if;

  select * into v_bot from bots where id = p_bot_id;
  if v_bot.owner_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  update bots
  set system_prompt = v_version.system_prompt,
      welcome_message = v_version.welcome_message,
      model = v_version.model,
      temperature = v_version.temperature,
      max_tokens = v_version.max_tokens,
      updated_at = now()
  where id = p_bot_id
  returning * into v_bot;

  return v_bot;
end;
$$ language plpgsql security definer;

grant execute on function rollback_to_version to authenticated;
