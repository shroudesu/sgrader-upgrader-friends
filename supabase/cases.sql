-- Shared demo cases, server-side opening, and public PNG case artwork.
-- Run this file once in Supabase Dashboard → SQL Editor.

create table if not exists public.game_cases (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  price numeric(14, 2) not null check (price > 0),
  image_url text,
  contents jsonb not null check (jsonb_typeof(contents) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_cases enable row level security;
revoke all on table public.game_cases from public, anon, authenticated;
grant select on table public.game_cases to authenticated;

drop policy if exists game_cases_read_authenticated on public.game_cases;
create policy game_cases_read_authenticated on public.game_cases
  for select to authenticated using (true);

-- Keep case drops in the same public wins feed used by upgrades.
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

create index if not exists upgrade_wins_created_at_idx on public.upgrade_wins (created_at desc);
alter table public.upgrade_wins enable row level security;
revoke all on table public.upgrade_wins from public, anon, authenticated;
grant select on table public.upgrade_wins to authenticated;
drop policy if exists upgrade_wins_read_authenticated on public.upgrade_wins;
create policy upgrade_wins_read_authenticated on public.upgrade_wins
  for select to authenticated using (true);

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'upgrade_wins'
     ) then
    alter publication supabase_realtime add table public.upgrade_wins;
  end if;
end;
$$;

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_reason_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_reason_check
  check (reason in (
    'admin_grant', 'admin_debit', 'game_sale', 'game_purchase', 'case_open',
    'battle_stake', 'battle_prize', 'battle_refund', 'upgrade_bonus_cash'
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-designs', 'case-designs', true, 5242880, array['image/png']::text[])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists case_designs_admin_upload on storage.objects;
create policy case_designs_admin_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'case-designs' and public.is_current_user_admin());

drop policy if exists case_designs_admin_update on storage.objects;
create policy case_designs_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'case-designs' and public.is_current_user_admin())
  with check (bucket_id = 'case-designs' and public.is_current_user_admin());

create or replace function public.admin_save_game_case(
  p_case_id uuid,
  p_name text,
  p_price numeric,
  p_image_url text,
  p_contents jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_total numeric;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'Case name must contain 2 to 40 characters';
  end if;
  if p_price is null or p_price <= 0 or p_price > 100000000 then
    raise exception 'Case price must be between 0.01 and 100000000';
  end if;
  if p_image_url is not null and char_length(p_image_url) > 2048 then
    raise exception 'Case image URL is too long';
  end if;
  if p_contents is null or jsonb_typeof(p_contents) <> 'array'
     or jsonb_array_length(p_contents) < 1 or jsonb_array_length(p_contents) > 200 then
    raise exception 'Case must contain 1 to 200 skins';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_contents) as entry(value)
     where jsonb_typeof(entry.value) <> 'object'
        or jsonb_typeof(entry.value -> 'item') <> 'object'
        or coalesce(entry.value -> 'item' ->> 'id', '') = ''
        or coalesce(entry.value -> 'item' ->> 'name', '') = ''
        or coalesce(entry.value -> 'item' ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
        or (entry.value -> 'item' ->> 'price')::numeric <= 0
        or coalesce(entry.value ->> 'chance', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
        or (entry.value ->> 'chance')::numeric < 0.1
        or (entry.value ->> 'chance')::numeric > 100
  ) then
    raise exception 'Each skin needs a valid price and a chance from 0.1 to 100';
  end if;

  select coalesce(sum((entry.value ->> 'chance')::numeric), 0)
    into v_total
    from jsonb_array_elements(p_contents) as entry(value);
  if abs(v_total - 100) > 0.001 then
    raise exception 'Case skin chances must total exactly 100';
  end if;

  if p_case_id is null then
    insert into public.game_cases (name, price, image_url, contents)
    values (v_name, round(p_price, 2), nullif(btrim(coalesce(p_image_url, '')), ''), p_contents)
    returning id into v_id;
  else
    update public.game_cases
       set name = v_name,
           price = round(p_price, 2),
           image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
           contents = p_contents,
           updated_at = now()
     where id = p_case_id
     returning id into v_id;
    if v_id is null then raise exception 'Case not found'; end if;
  end if;

  return jsonb_build_object('id', v_id, 'name', v_name, 'price', round(p_price, 2));
end;
$$;

revoke all on function public.admin_save_game_case(uuid, text, numeric, text, jsonb) from public, anon;
grant execute on function public.admin_save_game_case(uuid, text, numeric, text, jsonb) to authenticated;

create or replace function public.admin_delete_game_case(p_case_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted boolean;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  delete from public.game_cases where id = p_case_id returning true into v_deleted;
  if v_deleted is null then raise exception 'Case not found'; end if;
  return v_deleted;
end;
$$;

revoke all on function public.admin_delete_game_case(uuid) from public, anon;
grant execute on function public.admin_delete_game_case(uuid) to authenticated;

create or replace function public.open_game_case(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_case_name text;
  v_case_price numeric(14, 2);
  v_case_image_url text;
  v_contents jsonb;
  v_state jsonb;
  v_new_state jsonb;
  v_inventory jsonb;
  v_entry jsonb;
  v_skin jsonb;
  v_inventory_item jsonb;
  v_best_drop jsonb;
  v_best_drop_price numeric := 0;
  v_total numeric;
  v_running numeric := 0;
  v_roll numeric;
  v_skin_price numeric(14, 2);
  v_balance numeric(14, 2);
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;

  select c.name, c.price, c.image_url, c.contents
    into v_case_name, v_case_price, v_case_image_url, v_contents
    from public.game_cases c
   where c.id = p_case_id
   for share;
  if v_case_name is null then raise exception 'Case not found'; end if;
  if jsonb_typeof(v_contents) <> 'array' or jsonb_array_length(v_contents) < 1 or jsonb_array_length(v_contents) > 200 then
    raise exception 'Case contents are invalid';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_contents) as entry(value)
     where coalesce(entry.value ->> 'chance', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
        or (entry.value ->> 'chance')::numeric < 0.1
        or jsonb_typeof(entry.value -> 'item') <> 'object'
  ) then raise exception 'Case contents are invalid'; end if;
  select coalesce(sum((entry.value ->> 'chance')::numeric), 0)
    into v_total from jsonb_array_elements(v_contents) as entry(value);
  if abs(v_total - 100) > 0.001 then raise exception 'Case chances are invalid'; end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id
   for update;
  if v_state is null then raise exception 'Game state not found'; end if;
  v_inventory := coalesce(v_state -> 'inventory', '[]'::jsonb);
  if jsonb_typeof(v_inventory) <> 'array' then raise exception 'Player inventory is invalid'; end if;

  select w.balance into v_balance
    from public.wallets w
   where w.user_id = v_user_id
   for update;
  if v_balance is null then raise exception 'Wallet not found'; end if;
  if v_balance < v_case_price then
    raise exception 'Insufficient balance' using errcode = '22023';
  end if;

  v_roll := pg_catalog.random()::numeric * v_total;
  for v_entry in select entry.value from jsonb_array_elements(v_contents) as entry(value) loop
    v_running := v_running + (v_entry ->> 'chance')::numeric;
    if v_roll < v_running then
      v_skin := v_entry -> 'item';
      exit;
    end if;
  end loop;
  if v_skin is null then
    select entry.value -> 'item' into v_skin
      from jsonb_array_elements(v_contents) with ordinality as entry(value, position)
     order by entry.position desc limit 1;
  end if;
  if coalesce(v_skin ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
    raise exception 'Selected skin price is invalid';
  end if;
  v_skin_price := (v_skin ->> 'price')::numeric;
  v_inventory_item := jsonb_strip_nulls(jsonb_build_object(
    'instanceId', pg_catalog.gen_random_uuid()::text,
    'catalogId', v_skin -> 'id',
    'name', v_skin ->> 'name',
    'price', v_skin_price,
    'img', coalesce(v_skin ->> 'img', ''),
    'rarity', v_skin -> 'rarity',
    'catalogType', v_skin ->> 'catalogType',
    'category', v_skin ->> 'category',
    'wear', v_skin ->> 'wear',
    'floatMin', v_skin -> 'floatMin',
    'floatMax', v_skin -> 'floatMax',
    'stattrak', coalesce((v_skin ->> 'stattrak')::boolean, false),
    'souvenir', coalesce((v_skin ->> 'souvenir')::boolean, false),
    'effect', v_skin ->> 'effect',
    'pattern', v_skin ->> 'pattern'
  ));

  v_new_state := jsonb_set(v_state, '{inventory}', v_inventory || jsonb_build_array(v_inventory_item), true);
  v_best_drop := v_state -> 'bestDrop';
  if jsonb_typeof(v_best_drop) = 'object'
     and coalesce(v_best_drop ->> 'price', '') ~ '^[0-9]+(\.[0-9]{1,2})?$' then
    v_best_drop_price := (v_best_drop ->> 'price')::numeric;
  end if;
  if v_skin_price > v_best_drop_price then
    v_best_drop := jsonb_build_object('name', v_skin ->> 'name', 'price', v_skin_price, 'img', coalesce(v_skin ->> 'img', ''));
    v_new_state := jsonb_set(v_new_state, '{bestDrop}', v_best_drop, true);
  end if;

  update public.game_states
     set state = v_new_state, updated_at = now()
   where user_id = v_user_id;
  update public.wallets w
     set balance = w.balance - v_case_price, updated_at = now()
   where w.user_id = v_user_id
   returning w.balance into v_balance;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_user_id, v_user_id, -v_case_price, 0, 'case_open');

  return jsonb_build_object(
    'case_id', p_case_id,
    'case_name', v_case_name,
    'case_image_url', v_case_image_url,
    'skin', v_inventory_item,
    'best_drop', v_best_drop,
    'balance', v_balance
  );
end;
$$;

revoke all on function public.open_game_case(uuid) from public, anon;
grant execute on function public.open_game_case(uuid) to authenticated;

-- Keep case rewards pending until the player claims them or sells them.
create table if not exists public.case_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  case_id uuid references public.game_cases(id) on delete set null,
  case_name text not null,
  case_image_url text,
  case_price numeric(14, 2) not null check (case_price > 0),
  quantity integer not null check (quantity between 1 and 10),
  created_at timestamptz not null default now()
);

create table if not exists public.case_rewards (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null references public.case_openings(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  sequence_no integer not null check (sequence_no between 1 and 10),
  item jsonb not null check (jsonb_typeof(item) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'claimed', 'sold')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (opening_id, sequence_no)
);

create index if not exists case_openings_user_created_idx
  on public.case_openings (user_id, created_at desc);
create index if not exists case_rewards_user_pending_idx
  on public.case_rewards (user_id, created_at desc) where status = 'pending';

alter table public.case_openings enable row level security;
alter table public.case_rewards enable row level security;
revoke all on table public.case_openings, public.case_rewards from public, anon, authenticated;

create or replace function public.open_game_cases(p_case_id uuid, p_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_case_name text;
  v_case_price numeric(14, 2);
  v_case_image_url text;
  v_contents jsonb;
  v_total_chance numeric;
  v_wallet_balance numeric(14, 2);
  v_total_price numeric(14, 2);
  v_opening_id uuid;
  v_entry jsonb;
  v_skin jsonb;
  v_item jsonb;
  v_running numeric;
  v_roll numeric;
  v_skin_price numeric(14, 2);
  v_rewards jsonb := '[]'::jsonb;
  v_reward_id uuid;
  v_index integer;
  v_player_id bigint;
  v_username text;
  v_avatar text;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'Quantity must be between 1 and 10';
  end if;

  select c.name, c.price, c.image_url, c.contents
    into v_case_name, v_case_price, v_case_image_url, v_contents
    from public.game_cases c
   where c.id = p_case_id
   for share;
  if v_case_name is null then raise exception 'Case not found'; end if;
  if jsonb_typeof(v_contents) <> 'array' or jsonb_array_length(v_contents) < 1 or jsonb_array_length(v_contents) > 200 then
    raise exception 'Case contents are invalid';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_contents) as entry(value)
     where jsonb_typeof(entry.value -> 'item') <> 'object'
        or coalesce(entry.value ->> 'chance', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
        or (entry.value ->> 'chance')::numeric < 0.1
        or coalesce(entry.value -> 'item' ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
        or (entry.value -> 'item' ->> 'price')::numeric <= 0
  ) then raise exception 'Case contents are invalid'; end if;
  select coalesce(sum((entry.value ->> 'chance')::numeric), 0)
    into v_total_chance from jsonb_array_elements(v_contents) as entry(value);
  if abs(v_total_chance - 100) > 0.001 then raise exception 'Case chances are invalid'; end if;

  v_total_price := v_case_price * p_quantity;
  select w.balance into v_wallet_balance
    from public.wallets w where w.user_id = v_user_id for update;
  if v_wallet_balance is null then raise exception 'Wallet not found'; end if;
  if v_wallet_balance < v_total_price then
    raise exception 'Insufficient balance' using errcode = '22023';
  end if;

  select p.player_id, p.username, nullif(gs.state ->> 'avatar', '')
    into v_player_id, v_username, v_avatar
    from public.profiles p
    left join public.game_states gs on gs.user_id = p.user_id
   where p.user_id = v_user_id;
  if v_player_id is null then raise exception 'Player profile not found'; end if;

  insert into public.case_openings (user_id, case_id, case_name, case_image_url, case_price, quantity)
  values (v_user_id, p_case_id, v_case_name, v_case_image_url, v_case_price, p_quantity)
  returning id into v_opening_id;

  for v_index in 1..p_quantity loop
    v_running := 0;
    v_skin := null;
    v_roll := pg_catalog.random()::numeric * v_total_chance;
    for v_entry in select entry.value from jsonb_array_elements(v_contents) as entry(value) loop
      v_running := v_running + (v_entry ->> 'chance')::numeric;
      if v_roll < v_running then
        v_skin := v_entry -> 'item';
        exit;
      end if;
    end loop;
    if v_skin is null then
      select entry.value -> 'item' into v_skin
        from jsonb_array_elements(v_contents) with ordinality as entry(value, position)
       order by entry.position desc limit 1;
    end if;

    v_skin_price := (v_skin ->> 'price')::numeric;
    v_item := jsonb_strip_nulls(jsonb_build_object(
      'instanceId', pg_catalog.gen_random_uuid()::text,
      'catalogId', v_skin -> 'id',
      'name', v_skin ->> 'name',
      'price', v_skin_price,
      'img', coalesce(v_skin ->> 'img', ''),
      'rarity', v_skin -> 'rarity',
      'catalogType', v_skin ->> 'catalogType',
      'category', v_skin ->> 'category',
      'wear', v_skin ->> 'wear',
      'floatMin', v_skin -> 'floatMin',
      'floatMax', v_skin -> 'floatMax',
      'stattrak', coalesce((v_skin ->> 'stattrak')::boolean, false),
      'souvenir', coalesce((v_skin ->> 'souvenir')::boolean, false),
      'effect', v_skin ->> 'effect',
      'pattern', v_skin ->> 'pattern'
    ));
    insert into public.case_rewards (opening_id, user_id, sequence_no, item)
    values (v_opening_id, v_user_id, v_index, v_item)
    returning id into v_reward_id;
    insert into public.upgrade_wins (user_id, instance_id, player_id, username, avatar, item)
    values (
      v_user_id,
      v_item ->> 'instanceId',
      v_player_id,
      v_username,
      v_avatar,
      jsonb_build_object(
        'name', v_item ->> 'name',
        'price', (v_item ->> 'price')::numeric(14, 2),
        'img', v_item ->> 'img',
        'wear', v_item ->> 'wear',
        'stattrak', coalesce(v_item -> 'stattrak' = 'true'::jsonb, false),
        'souvenir', coalesce(v_item -> 'souvenir' = 'true'::jsonb, false),
        'rarity', v_item -> 'rarity',
        'case_name', v_case_name
      )
    )
    on conflict (user_id, instance_id) do nothing;
    v_rewards := v_rewards || jsonb_build_array(jsonb_build_object(
      'id', v_reward_id,
      'opening_id', v_opening_id,
      'sequence_no', v_index,
      'item', v_item,
      'status', 'pending'
    ));
  end loop;

  update public.wallets w
     set balance = w.balance - v_total_price, updated_at = now()
   where w.user_id = v_user_id
   returning w.balance into v_wallet_balance;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_user_id, v_user_id, -v_total_price, 0, 'case_open');

  return jsonb_build_object(
    'opening_id', v_opening_id,
    'case_id', p_case_id,
    'case_name', v_case_name,
    'case_image_url', v_case_image_url,
    'created_at', now(),
    'balance', v_wallet_balance,
    'rewards', v_rewards
  );
end;
$$;

revoke all on function public.open_game_cases(uuid, integer) from public, anon;
grant execute on function public.open_game_cases(uuid, integer) to authenticated;

create or replace function public.get_pending_case_rewards()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rewards jsonb;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'opening_id', r.opening_id,
    'sequence_no', r.sequence_no,
    'item', r.item,
    'status', r.status,
    'case_name', o.case_name,
    'case_image_url', o.case_image_url,
    'created_at', o.created_at
  ) order by o.created_at desc, r.sequence_no), '[]'::jsonb)
    into v_rewards
    from public.case_rewards r
    join public.case_openings o on o.id = r.opening_id
   where r.user_id = v_user_id and r.status = 'pending';
  return v_rewards;
end;
$$;

revoke all on function public.get_pending_case_rewards() from public, anon;
grant execute on function public.get_pending_case_rewards() to authenticated;

create or replace function public.settle_case_reward(p_reward_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reward public.case_rewards%rowtype;
  v_state jsonb;
  v_inventory jsonb;
  v_best_drop jsonb;
  v_best_price numeric := -1;
  v_item_price numeric(14, 2);
  v_amount numeric(14, 2) := 0;
  v_balance numeric(14, 2);
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if p_action is null or p_action not in ('claim', 'sell') then raise exception 'Invalid reward action'; end if;
  select r.* into v_reward
    from public.case_rewards r
   where r.id = p_reward_id and r.user_id = v_user_id and r.status = 'pending'
   for update;
  if v_reward.id is null then raise exception 'Pending case reward not found'; end if;

  select gs.state into v_state from public.game_states gs where gs.user_id = v_user_id for update;
  if v_state is null then raise exception 'Game state not found'; end if;
  select w.balance into v_balance from public.wallets w where w.user_id = v_user_id for update;
  if v_balance is null then raise exception 'Wallet not found'; end if;

  if p_action = 'claim' then
    v_inventory := coalesce(v_state -> 'inventory', '[]'::jsonb);
    if jsonb_typeof(v_inventory) <> 'array' then raise exception 'Player inventory is invalid'; end if;
    v_inventory := v_inventory || jsonb_build_array(v_reward.item);
    v_best_drop := v_state -> 'bestDrop';
    if jsonb_typeof(v_best_drop) = 'object'
       and coalesce(v_best_drop ->> 'price', '') ~ '^[0-9]+(\.[0-9]{1,2})?$' then
      v_best_price := (v_best_drop ->> 'price')::numeric;
    end if;
    v_item_price := coalesce((v_reward.item ->> 'price')::numeric, 0);
    if v_item_price > v_best_price then
      v_best_drop := jsonb_build_object('name', v_reward.item ->> 'name', 'price', v_item_price, 'img', coalesce(v_reward.item ->> 'img', ''));
    end if;
    v_state := jsonb_set(v_state, '{inventory}', v_inventory, true);
    v_state := jsonb_set(v_state, '{bestDrop}', coalesce(v_best_drop, 'null'::jsonb), true);
    update public.game_states set state = v_state, updated_at = now() where user_id = v_user_id;
  else
    v_item_price := coalesce((v_reward.item ->> 'price')::numeric, 0);
    v_amount := round(v_item_price, 2);
    update public.wallets w set balance = w.balance + v_amount, updated_at = now()
     where w.user_id = v_user_id returning w.balance into v_balance;
    insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
    values (v_user_id, v_user_id, v_amount, 0, 'game_sale');
  end if;

  update public.case_rewards set status = case when p_action = 'claim' then 'claimed' else 'sold' end,
         settled_at = now()
   where id = v_reward.id;
  return jsonb_build_object(
    'reward_id', v_reward.id,
    'item', v_reward.item,
    'action', p_action,
    'amount', v_amount,
    'balance', v_balance,
    'best_drop', v_best_drop
  );
end;
$$;

revoke all on function public.settle_case_reward(uuid, text) from public, anon;
grant execute on function public.settle_case_reward(uuid, text) to authenticated;

create or replace function public.settle_case_opening_rewards(p_opening_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state jsonb;
  v_inventory jsonb;
  v_best_drop jsonb;
  v_best_price numeric := -1;
  v_item_price numeric(14, 2);
  v_amount numeric(14, 2) := 0;
  v_balance numeric(14, 2);
  v_items jsonb := '[]'::jsonb;
  v_reward record;
  v_settled_count integer := 0;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if p_action is null or p_action not in ('claim', 'sell') then raise exception 'Invalid reward action'; end if;

  perform r.id from public.case_rewards r
   where r.opening_id = p_opening_id and r.user_id = v_user_id and r.status = 'pending'
   order by r.sequence_no for update;
  if not exists (
    select 1 from public.case_rewards r
     where r.opening_id = p_opening_id and r.user_id = v_user_id and r.status = 'pending'
  ) then raise exception 'No pending rewards for this opening'; end if;

  select gs.state into v_state from public.game_states gs where gs.user_id = v_user_id for update;
  if v_state is null then raise exception 'Game state not found'; end if;
  select w.balance into v_balance from public.wallets w where w.user_id = v_user_id for update;
  if v_balance is null then raise exception 'Wallet not found'; end if;

  if p_action = 'claim' then
    v_inventory := coalesce(v_state -> 'inventory', '[]'::jsonb);
    if jsonb_typeof(v_inventory) <> 'array' then raise exception 'Player inventory is invalid'; end if;
    v_best_drop := v_state -> 'bestDrop';
    if jsonb_typeof(v_best_drop) = 'object'
       and coalesce(v_best_drop ->> 'price', '') ~ '^[0-9]+(\.[0-9]{1,2})?$' then
      v_best_price := (v_best_drop ->> 'price')::numeric;
    end if;
    for v_reward in
      select r.id, r.item from public.case_rewards r
       where r.opening_id = p_opening_id and r.user_id = v_user_id and r.status = 'pending'
       order by r.sequence_no
    loop
      v_items := v_items || jsonb_build_array(v_reward.item);
      v_item_price := coalesce((v_reward.item ->> 'price')::numeric, 0);
      if v_item_price > v_best_price then
        v_best_price := v_item_price;
        v_best_drop := jsonb_build_object('name', v_reward.item ->> 'name', 'price', v_item_price, 'img', coalesce(v_reward.item ->> 'img', ''));
      end if;
      v_settled_count := v_settled_count + 1;
    end loop;
    v_inventory := v_inventory || v_items;
    v_state := jsonb_set(v_state, '{inventory}', v_inventory, true);
    v_state := jsonb_set(v_state, '{bestDrop}', coalesce(v_best_drop, 'null'::jsonb), true);
    update public.game_states set state = v_state, updated_at = now() where user_id = v_user_id;
  else
    for v_reward in
      select r.id, r.item from public.case_rewards r
       where r.opening_id = p_opening_id and r.user_id = v_user_id and r.status = 'pending'
       order by r.sequence_no
    loop
      v_items := v_items || jsonb_build_array(v_reward.item);
      v_item_price := coalesce((v_reward.item ->> 'price')::numeric, 0);
      v_amount := v_amount + round(v_item_price, 2);
      v_settled_count := v_settled_count + 1;
    end loop;
    v_amount := round(v_amount, 2);
    update public.wallets w set balance = w.balance + v_amount, updated_at = now()
     where w.user_id = v_user_id returning w.balance into v_balance;
    insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
    values (v_user_id, v_user_id, v_amount, 0, 'game_sale');
  end if;

  update public.case_rewards set status = case when p_action = 'claim' then 'claimed' else 'sold' end,
         settled_at = now()
   where opening_id = p_opening_id and user_id = v_user_id and status = 'pending';
  return jsonb_build_object(
    'opening_id', p_opening_id,
    'action', p_action,
    'settled_count', v_settled_count,
    'items', v_items,
    'amount', v_amount,
    'balance', v_balance,
    'best_drop', v_best_drop
  );
end;
$$;

revoke all on function public.settle_case_opening_rewards(uuid, text) from public, anon;
grant execute on function public.settle_case_opening_rewards(uuid, text) to authenticated;

-- Keep the single-case RPC compatible while enforcing the pending-reward flow.
create or replace function public.open_game_case(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.open_game_cases(p_case_id, 1);
end;
$$;

revoke all on function public.open_game_case(uuid) from public, anon;
grant execute on function public.open_game_case(uuid) to authenticated;

notify pgrst, 'reload schema';
