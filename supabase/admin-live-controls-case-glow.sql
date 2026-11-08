-- Admin page refresh, catalog skin grants, and per-case glow color.
-- Apply after cases.sql, case-categories.sql, admin-inventory.sql, and admin-moderation.sql.

alter table public.game_cases
  add column if not exists glow_color text not null default '#4ade80';

create table if not exists public.admin_user_commands (
  id bigint generated always as identity primary key,
  target_user_id uuid references public.profiles(user_id) on delete cascade,
  command text not null check (command = 'refresh'),
  created_at timestamptz not null default now()
);

create index if not exists admin_user_commands_target_created_idx
  on public.admin_user_commands (target_user_id, created_at desc);

alter table public.admin_user_commands enable row level security;
revoke all on table public.admin_user_commands from public, anon, authenticated;
grant select on table public.admin_user_commands to authenticated;

drop policy if exists admin_user_commands_read_target on public.admin_user_commands;
create policy admin_user_commands_read_target on public.admin_user_commands
  for select to authenticated
  using (
    target_user_id is null
    or target_user_id = auth.uid()
    or public.is_current_user_admin()
  );

create or replace function public.admin_request_page_refresh(p_player_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_player_id bigint;
  v_username text;
  v_command_id bigint;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_player_id is not null then
    select p.user_id, p.player_id, p.username
      into v_target, v_player_id, v_username
      from public.profiles p
     where p.player_id = p_player_id;
    if v_target is null then raise exception 'Player not found'; end if;
  end if;

  delete from public.admin_user_commands where created_at < now() - interval '7 days';
  insert into public.admin_user_commands(target_user_id, command)
  values (v_target, 'refresh')
  returning id into v_command_id;

  return jsonb_build_object(
    'command_id', v_command_id,
    'player_id', v_player_id,
    'username', v_username,
    'sent_to_all', p_player_id is null
  );
end;
$$;

revoke all on function public.admin_request_page_refresh(bigint) from public, anon;
grant execute on function public.admin_request_page_refresh(bigint) to authenticated;

create or replace function public.admin_add_player_inventory_item(
  p_player_id bigint,
  p_item jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_username text;
  v_state jsonb;
  v_inventory jsonb;
  v_item_id text;
  v_name text;
  v_price numeric(14, 2);
  v_item jsonb;
  v_new_count integer;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_item is null or jsonb_typeof(p_item) <> 'object' then
    raise exception 'Catalog item must be an object';
  end if;

  v_item_id := nullif(btrim(coalesce(p_item ->> 'id', '')), '');
  v_name := nullif(btrim(coalesce(p_item ->> 'name', '')), '');
  if v_item_id is null or length(v_item_id) > 240 then
    raise exception 'Catalog item id is invalid';
  end if;
  if v_name is null or length(v_name) > 200 then
    raise exception 'Catalog item name is invalid';
  end if;
  if coalesce(p_item ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
    raise exception 'Catalog item price is invalid';
  end if;
  v_price := round((p_item ->> 'price')::numeric, 2);
  if v_price <= 0 or v_price > 1000000000 then
    raise exception 'Catalog item price must be between 0.01 and 1000000000';
  end if;
  if length(coalesce(p_item ->> 'img', '')) > 2048 then
    raise exception 'Catalog item image URL is too long';
  end if;

  select p.user_id, p.username into v_user_id, v_username
    from public.profiles p
   where p.player_id = p_player_id
   for update;
  if v_user_id is null then raise exception 'Player not found'; end if;

  insert into public.game_states(user_id, state)
  values (v_user_id, '{"inventory":[],"betId":null,"betItemIds":[],"targetName":null,"bestDrop":null}'::jsonb)
  on conflict (user_id) do nothing;
  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id
   for update;
  v_inventory := coalesce(v_state -> 'inventory', '[]'::jsonb);
  if jsonb_typeof(v_inventory) <> 'array' then
    raise exception 'Player inventory is invalid';
  end if;

  v_item := (p_item - 'id') || jsonb_build_object(
    'catalogId', v_item_id,
    'instanceId', gen_random_uuid()::text,
    'name', v_name,
    'price', v_price
  );
  v_inventory := v_inventory || jsonb_build_array(v_item);
  v_state := jsonb_set(coalesce(v_state, '{}'::jsonb), '{inventory}', v_inventory, true);
  update public.game_states
     set state = v_state, updated_at = now()
   where user_id = v_user_id;

  v_new_count := jsonb_array_length(v_inventory);
  return jsonb_build_object(
    'player_id', p_player_id,
    'username', v_username,
    'item_name', v_name,
    'inventory_count', v_new_count,
    'item', v_item
  );
end;
$$;

revoke all on function public.admin_add_player_inventory_item(bigint, jsonb) from public, anon;
grant execute on function public.admin_add_player_inventory_item(bigint, jsonb) to authenticated;

-- The six-argument case editor keeps category ordering; this overload adds the glow field.
create or replace function public.admin_save_game_case(
  p_case_id uuid,
  p_name text,
  p_price numeric,
  p_image_url text,
  p_contents jsonb,
  p_category_id uuid,
  p_glow_color text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_category uuid;
  v_id uuid;
  v_next_order integer;
  v_glow text := lower(coalesce(p_glow_color, '#4ade80'));
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if v_glow !~ '^#[0-9a-f]{6}$' then
    raise exception 'Case glow color must be a six-digit hex color';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.game_case_categories where id = p_category_id
  ) then
    raise exception 'Case category not found';
  end if;

  if p_case_id is not null then
    select category_id into v_old_category
      from public.game_cases where id = p_case_id for update;
    if not found then raise exception 'Case not found'; end if;
  end if;

  v_result := public.admin_save_game_case(p_case_id, p_name, p_price, p_image_url, p_contents);
  v_id := (v_result ->> 'id')::uuid;
  if p_case_id is null or v_old_category is distinct from p_category_id then
    select coalesce(max(sort_order), 0) + 1 into v_next_order
      from public.game_cases
     where category_id is not distinct from p_category_id and id <> v_id;
    update public.game_cases
       set category_id = p_category_id, sort_order = v_next_order, glow_color = v_glow
     where id = v_id;
  else
    update public.game_cases set glow_color = v_glow where id = v_id;
  end if;

  return v_result || jsonb_build_object('category_id', p_category_id, 'glow_color', v_glow);
end;
$$;

revoke all on function public.admin_save_game_case(uuid, text, numeric, text, jsonb, uuid, text) from public, anon;
grant execute on function public.admin_save_game_case(uuid, text, numeric, text, jsonb, uuid, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'admin_user_commands'
     ) then
    execute 'alter publication supabase_realtime add table public.admin_user_commands';
  end if;
end;
$$;

notify pgrst, 'reload schema';
