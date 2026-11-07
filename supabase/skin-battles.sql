-- Add shared 50/50 skin battles to an existing SGRADER UP database.
-- Every battle is settled inside a security-definer transaction; clients cannot
-- write battle rows or choose the winner.

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_reason_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_reason_check
  check (reason in ('admin_grant', 'admin_debit', 'game_sale', 'game_purchase'));

create table if not exists public.skin_battles (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(user_id) on delete cascade,
  creator_name text not null,
  creator_skin jsonb not null,
  guest_user_id uuid references public.profiles(user_id) on delete set null,
  guest_name text,
  guest_skin jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'completed', 'cancelled')),
  winner_user_id uuid references public.profiles(user_id) on delete set null,
  winner_name text,
  winner_side text check (winner_side is null or winner_side in ('creator', 'guest')),
  bank_value numeric(14, 2) not null default 0 check (bank_value >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.skin_battles enable row level security;
revoke all on table public.skin_battles from public, anon, authenticated;
grant select on table public.skin_battles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'skin_battles'
       and policyname = 'skin_battles_read_authenticated'
  ) then
    create policy skin_battles_read_authenticated on public.skin_battles
      for select to authenticated using (true);
  end if;
end
$$;

-- Replace the former one-skin RPCs with the multi-skin versions.
drop function if exists public.create_skin_battle(text);
drop function if exists public.join_skin_battle(uuid, text);

create or replace function public.create_skin_battle(p_inventory_item_ids text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state jsonb;
  v_skins jsonb;
  v_inventory jsonb;
  v_battle_id uuid;
  v_price numeric(14, 2) := 0;
  v_selected_count integer;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if coalesce(cardinality(p_inventory_item_ids), 0) < 1 or cardinality(p_inventory_item_ids) > 5 then
    raise exception 'Choose between one and five skins';
  end if;
  if exists (select 1 from unnest(p_inventory_item_ids) as requested(item_id) where nullif(trim(requested.item_id), '') is null) then
    raise exception 'Inventory item id is invalid';
  end if;
  if (select count(distinct requested.item_id) from unnest(p_inventory_item_ids) as requested(item_id)) <> cardinality(p_inventory_item_ids) then
    raise exception 'The same inventory item cannot be selected twice';
  end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id
   for update;
  if not found then raise exception 'Game state not found'; end if;

  select count(distinct requested.item_id) into v_selected_count
    from unnest(p_inventory_item_ids) as requested(item_id)
    join jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) as entry(item)
      on entry.item ->> 'instanceId' = requested.item_id;
  if v_selected_count <> cardinality(p_inventory_item_ids) then
    raise exception 'One or more skins are no longer in inventory';
  end if;

  if exists (
    select 1
      from unnest(p_inventory_item_ids) with ordinality as requested(item_id, position)
      cross join lateral (
        select entry.item
          from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) with ordinality as entry(item, inventory_position)
         where entry.item ->> 'instanceId' = requested.item_id
         order by entry.inventory_position
         limit 1
      ) as picked
     where coalesce(picked.item ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
  ) then
    raise exception 'Skin price is invalid';
  end if;

  select coalesce(jsonb_agg(picked.item order by requested.position), '[]'::jsonb),
         coalesce(sum((picked.item ->> 'price')::numeric), 0)::numeric(14, 2)
    into v_skins, v_price
    from unnest(p_inventory_item_ids) with ordinality as requested(item_id, position)
    cross join lateral (
      select entry.item
        from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) with ordinality as entry(item, inventory_position)
       where entry.item ->> 'instanceId' = requested.item_id
       order by entry.inventory_position
       limit 1
    ) as picked;
  if v_price <= 0 then raise exception 'Skin price must be positive'; end if;

  select coalesce(jsonb_agg(entry.item order by entry.ordinality), '[]'::jsonb)
    into v_inventory
    from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) with ordinality as entry(item, ordinality)
   where not coalesce(entry.item ->> 'instanceId' = any(p_inventory_item_ids), false);

  update public.game_states
     set state = jsonb_set(v_state, '{inventory}', v_inventory, true), updated_at = now()
   where user_id = v_user_id;

  insert into public.skin_battles (creator_user_id, creator_name, creator_skin, bank_value)
  select p.user_id, p.username, v_skins, v_price
    from public.profiles p
   where p.user_id = v_user_id
  returning id into v_battle_id;
  if v_battle_id is null then raise exception 'Player profile not found'; end if;

  return v_battle_id;
end;
$$;

revoke all on function public.create_skin_battle(text[]) from public, anon;
grant execute on function public.create_skin_battle(text[]) to authenticated;

create or replace function public.join_skin_battle(
  p_battle_id uuid,
  p_inventory_item_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_battle public.skin_battles%rowtype;
  v_guest_state jsonb;
  v_creator_state jsonb;
  v_guest_skins jsonb;
  v_creator_skins jsonb;
  v_guest_inventory jsonb;
  v_winner_side text;
  v_winner_id uuid;
  v_winner_name text;
  v_guest_name text;
  v_guest_price numeric(14, 2) := 0;
  v_bank_value numeric(14, 2);
  v_selected_count integer;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if coalesce(cardinality(p_inventory_item_ids), 0) < 1 or cardinality(p_inventory_item_ids) > 5 then
    raise exception 'Choose between one and five skins';
  end if;
  if exists (select 1 from unnest(p_inventory_item_ids) as requested(item_id) where nullif(trim(requested.item_id), '') is null) then
    raise exception 'Inventory item id is invalid';
  end if;
  if (select count(distinct requested.item_id) from unnest(p_inventory_item_ids) as requested(item_id)) <> cardinality(p_inventory_item_ids) then
    raise exception 'The same inventory item cannot be selected twice';
  end if;

  select b.* into v_battle
    from public.skin_battles b
   where b.id = p_battle_id
   for update;
  if not found or v_battle.status <> 'waiting' then
    raise exception 'Battle has already started';
  end if;
  if v_battle.creator_user_id = v_user_id then
    raise exception 'Creator cannot join their own battle';
  end if;

  -- Lock both players in a stable order to avoid crossed-battle deadlocks.
  perform gs.user_id
    from public.game_states gs
   where gs.user_id in (v_user_id, v_battle.creator_user_id)
   order by gs.user_id
   for update;
  select gs.state into v_guest_state from public.game_states gs where gs.user_id = v_user_id;
  select gs.state into v_creator_state from public.game_states gs where gs.user_id = v_battle.creator_user_id;
  if v_guest_state is null or v_creator_state is null then raise exception 'Game state not found'; end if;

  select count(distinct requested.item_id) into v_selected_count
    from unnest(p_inventory_item_ids) as requested(item_id)
    join jsonb_array_elements(coalesce(v_guest_state -> 'inventory', '[]'::jsonb)) as entry(item)
      on entry.item ->> 'instanceId' = requested.item_id;
  if v_selected_count <> cardinality(p_inventory_item_ids) then
    raise exception 'One or more skins are no longer in inventory';
  end if;

  if exists (
    select 1
      from unnest(p_inventory_item_ids) with ordinality as requested(item_id, position)
      cross join lateral (
        select entry.item
          from jsonb_array_elements(coalesce(v_guest_state -> 'inventory', '[]'::jsonb)) with ordinality as entry(item, inventory_position)
         where entry.item ->> 'instanceId' = requested.item_id
         order by entry.inventory_position
         limit 1
      ) as picked
     where coalesce(picked.item ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
  ) then
    raise exception 'Skin price is invalid';
  end if;
  select coalesce(jsonb_agg(picked.item order by requested.position), '[]'::jsonb),
         coalesce(sum((picked.item ->> 'price')::numeric), 0)::numeric(14, 2)
    into v_guest_skins, v_guest_price
    from unnest(p_inventory_item_ids) with ordinality as requested(item_id, position)
    cross join lateral (
      select entry.item
        from jsonb_array_elements(coalesce(v_guest_state -> 'inventory', '[]'::jsonb)) with ordinality as entry(item, inventory_position)
       where entry.item ->> 'instanceId' = requested.item_id
       order by entry.inventory_position
       limit 1
    ) as picked;
  if v_guest_price <= 0 then raise exception 'Skin price must be positive'; end if;
  if v_guest_price < v_battle.bank_value * 0.95 then
    raise exception 'Guest total skin value must be at least 95%% of creator stake' using errcode = '22023';
  end if;

  v_creator_skins := case
    when jsonb_typeof(v_battle.creator_skin) = 'array' then v_battle.creator_skin
    else jsonb_build_array(v_battle.creator_skin)
  end;
  select coalesce(jsonb_agg(entry.item order by entry.ordinality), '[]'::jsonb)
    into v_guest_inventory
    from jsonb_array_elements(coalesce(v_guest_state -> 'inventory', '[]'::jsonb)) with ordinality as entry(item, ordinality)
   where not coalesce(entry.item ->> 'instanceId' = any(p_inventory_item_ids), false);

  update public.game_states
     set state = jsonb_set(v_guest_state, '{inventory}', v_guest_inventory, true), updated_at = now()
   where user_id = v_user_id;

  select p.username into v_guest_name from public.profiles p where p.user_id = v_user_id;
  if v_guest_name is null then raise exception 'Player profile not found'; end if;

  -- One uniform server-side draw: each side owns exactly half of the wheel.
  v_winner_side := case when pg_catalog.random() < 0.5 then 'creator' else 'guest' end;
  if v_winner_side = 'creator' then
    v_winner_id := v_battle.creator_user_id;
    v_winner_name := v_battle.creator_name;
    update public.game_states
       set state = jsonb_set(
         v_creator_state,
         '{inventory}',
         coalesce(v_creator_state -> 'inventory', '[]'::jsonb) || v_creator_skins || v_guest_skins,
         true
       ), updated_at = now()
     where user_id = v_battle.creator_user_id;
  else
    v_winner_id := v_user_id;
    v_winner_name := v_guest_name;
    update public.game_states
       set state = jsonb_set(
         v_guest_state,
         '{inventory}',
         v_guest_inventory || v_creator_skins || v_guest_skins,
         true
       ), updated_at = now()
     where user_id = v_user_id;
  end if;

  v_bank_value := v_battle.bank_value + v_guest_price;
  update public.skin_battles
     set guest_user_id = v_user_id,
         guest_name = v_guest_name,
         guest_skin = v_guest_skins,
         status = 'completed',
         winner_user_id = v_winner_id,
         winner_name = v_winner_name,
         winner_side = v_winner_side,
         bank_value = v_bank_value,
         completed_at = now()
   where id = p_battle_id;

  return jsonb_build_object(
    'id', p_battle_id,
    'status', 'completed',
    'creator_user_id', v_battle.creator_user_id,
    'guest_user_id', v_user_id,
    'creator_name', v_battle.creator_name,
    'creator_skin', v_creator_skins,
    'guest_name', v_guest_name,
    'guest_skin', v_guest_skins,
    'winner_name', v_winner_name,
    'winner_side', v_winner_side,
    'winner_user_id', v_winner_id,
    'bank_value', v_bank_value
  );
end;
$$;

revoke all on function public.join_skin_battle(uuid, text[]) from public, anon;
grant execute on function public.join_skin_battle(uuid, text[]) to authenticated;

create or replace function public.cancel_skin_battle(p_battle_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_battle public.skin_battles%rowtype;
  v_state jsonb;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  select b.* into v_battle
    from public.skin_battles b
   where b.id = p_battle_id
   for update;
  if not found or v_battle.status <> 'waiting' then
    raise exception 'Battle cannot be cancelled';
  end if;
  if v_battle.creator_user_id <> v_user_id then
    raise exception 'Only the creator can cancel this battle';
  end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id
   for update;
  if v_state is null then raise exception 'Game state not found'; end if;

  update public.game_states
     set state = jsonb_set(
       v_state,
       '{inventory}',
       coalesce(v_state -> 'inventory', '[]'::jsonb) ||
       case when jsonb_typeof(v_battle.creator_skin) = 'array'
         then v_battle.creator_skin
         else jsonb_build_array(v_battle.creator_skin)
       end,
       true
     ), updated_at = now()
   where user_id = v_user_id;

  update public.skin_battles set status = 'cancelled' where id = p_battle_id;
  return true;
end;
$$;

revoke all on function public.cancel_skin_battle(uuid) from public, anon;
grant execute on function public.cancel_skin_battle(uuid) to authenticated;

create or replace function public.admin_debit_demo_credits(
  p_player_id bigint,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_username text;
  v_amount numeric(14, 2);
  v_balance numeric(14, 2);
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'Amount must be between 0.01 and 100000000';
  end if;
  v_amount := round(p_amount, 2);
  if v_amount <= 0 then raise exception 'Amount must be at least 0.01'; end if;

  select p.user_id, p.username
    into v_target, v_username
    from public.profiles p
   where p.player_id = p_player_id
   for update;
  if v_target is null then raise exception 'Player not found'; end if;

  select w.balance into v_balance
    from public.wallets w
   where w.user_id = v_target
   for update;
  if v_balance is null then raise exception 'Player wallet not found'; end if;
  if v_balance < v_amount then
    raise exception 'Insufficient balance' using errcode = '22023';
  end if;

  update public.wallets w
     set balance = w.balance - v_amount,
         updated_at = now()
   where w.user_id = v_target
   returning w.balance into v_balance;

  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_target, auth.uid(), -v_amount, 0, 'admin_debit');

  return jsonb_build_object(
    'player_id', p_player_id,
    'username', v_username,
    'amount', v_amount,
    'balance', v_balance
  );
end;
$$;

revoke all on function public.admin_debit_demo_credits(bigint, numeric) from public, anon;
grant execute on function public.admin_debit_demo_credits(bigint, numeric) to authenticated;

notify pgrst, 'reload schema';
