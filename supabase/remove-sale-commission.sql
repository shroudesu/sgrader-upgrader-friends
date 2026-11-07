-- Remove sale fees from player, admin, and case reward sales.
-- Run once in the Supabase SQL Editor; this only replaces existing sale RPCs.

create or replace function public.admin_manage_player_inventory(
  p_player_id bigint,
  p_inventory_item_id text,
  p_action text
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
  v_item jsonb;
  v_new_inventory jsonb;
  v_new_bet_item_ids jsonb;
  v_bet_catalog_id text;
  v_balance numeric(14, 2);
  v_sale_amount numeric(14, 2) := 0;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('delete', 'sell') then
    raise exception 'Action must be delete or sell';
  end if;
  if nullif(trim(coalesce(p_inventory_item_id, '')), '') is null then
    raise exception 'Inventory item id is required';
  end if;

  select p.user_id, p.username into v_user_id, v_username
    from public.profiles p
   where p.player_id = p_player_id
   for update;
  if v_user_id is null then raise exception 'Player not found'; end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id
   for update;
  if v_state is null then raise exception 'Player game state not found'; end if;

  select entry.item into v_item
    from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) as entry(item)
   where entry.item ->> 'instanceId' = p_inventory_item_id
   limit 1;
  if v_item is null then raise exception 'Item not found in inventory'; end if;

  select w.balance into v_balance
    from public.wallets w
   where w.user_id = v_user_id
   for update;
  if v_balance is null then raise exception 'Player wallet not found'; end if;

  if p_action = 'sell' then
    if coalesce(v_item ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'Item price is invalid';
    end if;
    v_sale_amount := round((v_item ->> 'price')::numeric, 2);
    if v_sale_amount <= 0 then raise exception 'Sale value must be positive'; end if;
  end if;

  select coalesce(jsonb_agg(entry.item order by entry.ordinality), '[]'::jsonb)
    into v_new_inventory
    from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) with ordinality as entry(item, ordinality)
   where not coalesce(entry.item ->> 'instanceId' = p_inventory_item_id, false);

  v_state := jsonb_set(v_state, '{inventory}', v_new_inventory, true);
  if jsonb_typeof(v_state -> 'betItemIds') = 'array' then
    select coalesce(jsonb_agg(to_jsonb(selected.item_id) order by selected.ordinality), '[]'::jsonb)
      into v_new_bet_item_ids
      from jsonb_array_elements_text(v_state -> 'betItemIds') with ordinality as selected(item_id, ordinality)
     where selected.item_id <> p_inventory_item_id;
    v_state := jsonb_set(v_state, '{betItemIds}', v_new_bet_item_ids, true);

    select inventory.item ->> 'catalogId' into v_bet_catalog_id
      from jsonb_array_elements(v_new_inventory) as inventory(item)
      join jsonb_array_elements_text(v_new_bet_item_ids) with ordinality as selected(item_id, ordinality)
        on inventory.item ->> 'instanceId' = selected.item_id
     order by selected.ordinality
     limit 1;
    if v_bet_catalog_id is not null then
      v_state := jsonb_set(v_state, '{betId}', to_jsonb(v_bet_catalog_id), true);
    else
      v_state := jsonb_set(v_state, '{betId}', 'null'::jsonb, true);
    end if;
  elsif coalesce(v_state ->> 'betId', '') = coalesce(v_item ->> 'catalogId', '') then
    v_state := jsonb_set(v_state, '{betId}', 'null'::jsonb, true);
  end if;

  update public.game_states
     set state = v_state, updated_at = now()
   where user_id = v_user_id;

  if p_action = 'sell' then
    update public.wallets w
       set balance = w.balance + v_sale_amount,
           updated_at = now()
     where w.user_id = v_user_id
     returning w.balance into v_balance;

    insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
    values (v_user_id, auth.uid(), v_sale_amount, 0, 'game_sale');
  end if;

  return jsonb_build_object(
    'player_id', p_player_id,
    'username', v_username,
    'action', p_action,
    'item_name', coalesce(v_item ->> 'name', 'Предмет'),
    'amount', v_sale_amount,
    'balance', v_balance
  );
end;
$$;

revoke all on function public.admin_manage_player_inventory(bigint, text, text) from public, anon;
grant execute on function public.admin_manage_player_inventory(bigint, text, text) to authenticated;

create or replace function public.sell_all_inventory()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state jsonb;
  v_new_state jsonb;
  v_inventory jsonb;
  v_item_count integer;
  v_balance numeric(14, 2);
  v_amount numeric(14, 2);
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id
   for update;
  if v_state is null then raise exception 'Game state not found'; end if;
  v_inventory := coalesce(v_state -> 'inventory', '[]'::jsonb);
  if jsonb_typeof(v_inventory) <> 'array' then
    raise exception 'Player inventory is invalid';
  end if;

  select w.balance into v_balance
    from public.wallets w
   where w.user_id = v_user_id
   for update;
  if v_balance is null then raise exception 'Wallet not found'; end if;

  select count(*) into v_item_count
    from jsonb_array_elements(v_inventory) as entry(item);
  if v_item_count = 0 then
    return jsonb_build_object('sold_count', 0, 'amount', 0, 'balance', v_balance);
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_inventory) as entry(item)
     where coalesce(entry.item ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
  ) then
    raise exception 'Inventory contains an invalid item price';
  end if;

  select round(sum((entry.item ->> 'price')::numeric), 2)::numeric(14, 2)
    into v_amount
    from jsonb_array_elements(v_inventory) as entry(item);
  if v_amount <= 0 then raise exception 'Inventory sale value must be positive'; end if;
  if v_balance + v_amount > 999999999999.99 then
    raise exception 'Wallet balance limit would be exceeded';
  end if;

  v_new_state := jsonb_set(v_state, '{inventory}', '[]'::jsonb, true);
  v_new_state := jsonb_set(v_new_state, '{betId}', 'null'::jsonb, true);
  v_new_state := jsonb_set(v_new_state, '{betItemIds}', '[]'::jsonb, true);
  update public.game_states
     set state = v_new_state, updated_at = now()
   where user_id = v_user_id;

  update public.wallets w
     set balance = w.balance + v_amount, updated_at = now()
   where w.user_id = v_user_id
   returning w.balance into v_balance;

  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_user_id, v_user_id, v_amount, 0, 'game_sale');

  return jsonb_build_object(
    'sold_count', v_item_count,
    'amount', v_amount,
    'balance', v_balance
  );
end;
$$;

revoke all on function public.sell_all_inventory() from public, anon;
grant execute on function public.sell_all_inventory() to authenticated;

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
