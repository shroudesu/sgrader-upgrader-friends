-- Shared upgrade wins feed and read-only public player profiles.
-- Run once after schema.sql (and skin-battles.sql) in Supabase SQL Editor.

create table if not exists public.upgrade_wins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  instance_id text not null,
  player_id bigint not null,
  username text not null,
  avatar text,
  item jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, instance_id)
);

alter table public.upgrade_wins enable row level security;
revoke all on table public.upgrade_wins from public, anon, authenticated;
grant select on table public.upgrade_wins to authenticated;

drop policy if exists upgrade_wins_read_authenticated on public.upgrade_wins;
create policy upgrade_wins_read_authenticated on public.upgrade_wins
  for select to authenticated using (true);

create or replace function public.get_upgrade_wins_feed()
returns table (
  id bigint,
  player_id bigint,
  username text,
  avatar text,
  item jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.player_id, w.username, w.avatar, w.item, w.created_at
    from public.upgrade_wins as w
   order by w.created_at desc
   limit 24;
$$;

revoke all on function public.get_upgrade_wins_feed() from public, anon, authenticated;
grant execute on function public.get_upgrade_wins_feed() to anon, authenticated;

create or replace function public.publish_upgrade_win(p_instance_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state jsonb;
  v_item jsonb;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if nullif(trim(coalesce(p_instance_id, '')), '') is null then
    raise exception 'Item instance is required';
  end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id;
  if v_state is null then raise exception 'Game state not found'; end if;

  select entry.item into v_item
    from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) as entry(item)
   where entry.item ->> 'instanceId' = p_instance_id
   limit 1;
  if v_item is null then raise exception 'Won item is no longer in inventory'; end if;
  if coalesce(v_item ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
    raise exception 'Item price is invalid';
  end if;

  select p.* into v_profile
    from public.profiles p
   where p.user_id = v_user_id;
  if not found then raise exception 'Player profile not found'; end if;

  insert into public.upgrade_wins (user_id, instance_id, player_id, username, avatar, item)
  values (
    v_user_id,
    p_instance_id,
    v_profile.player_id,
    v_profile.username,
    nullif(v_state ->> 'avatar', ''),
    jsonb_build_object(
      'name', v_item ->> 'name',
      'price', (v_item ->> 'price')::numeric(14, 2),
      'img', v_item ->> 'img',
      'wear', v_item ->> 'wear',
      'stattrak', coalesce(v_item -> 'stattrak' = 'true'::jsonb, false),
      'souvenir', coalesce(v_item -> 'souvenir' = 'true'::jsonb, false),
      'rarity', v_item -> 'rarity'
    )
  )
  on conflict (user_id, instance_id) do nothing;

  return true;
end;
$$;

revoke all on function public.publish_upgrade_win(text) from public, anon;
grant execute on function public.publish_upgrade_win(text) to authenticated;

create or replace function public.get_public_player_profile(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_state jsonb;
  v_inventory jsonb;
  v_inventory_count integer;
  v_inventory_value numeric(14, 2);
  v_best_drop jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_user_id is null then raise exception 'Player ID is required'; end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = p_user_id;
  if v_state is null then raise exception 'Player not found'; end if;

  select count(*)::integer,
         coalesce(sum(case
           when entry.item ->> 'price' ~ '^[0-9]+(\.[0-9]{1,2})?$'
             then (entry.item ->> 'price')::numeric
           else 0
         end), 0)::numeric(14, 2),
         coalesce(jsonb_agg(entry.item - 'instanceId' order by entry.ordinality), '[]'::jsonb)
    into v_inventory_count, v_inventory_value, v_inventory
    from jsonb_array_elements(
      case when jsonb_typeof(v_state -> 'inventory') = 'array'
        then v_state -> 'inventory' else '[]'::jsonb end
    ) with ordinality as entry(item, ordinality);

  v_best_drop := null;
  if jsonb_typeof(v_state -> 'bestDrop') = 'object'
     and coalesce(v_state -> 'bestDrop' ->> 'price', '') ~ '^[0-9]+(\.[0-9]{1,2})?$' then
    v_best_drop := jsonb_build_object(
      'name', v_state -> 'bestDrop' ->> 'name',
      'price', (v_state -> 'bestDrop' ->> 'price')::numeric(14, 2),
      'img', v_state -> 'bestDrop' ->> 'img'
    );
  end if;

  select jsonb_build_object(
    'user_id', p.user_id,
    'player_id', p.player_id,
    'username', p.username,
    'avatar', nullif(v_state ->> 'avatar', ''),
    'balance', w.balance,
    'inventory_count', v_inventory_count,
    'inventory_value', v_inventory_value,
    'best_drop', v_best_drop,
    'inventory', v_inventory
  ) into v_result
    from public.profiles p
    join public.wallets w on w.user_id = p.user_id
   where p.user_id = p_user_id;

  if v_result is null then raise exception 'Player not found'; end if;
  return v_result;
end;
$$;

revoke all on function public.get_public_player_profile(uuid) from public, anon;
grant execute on function public.get_public_player_profile(uuid) to authenticated;
