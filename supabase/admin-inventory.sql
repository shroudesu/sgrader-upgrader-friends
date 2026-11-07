-- Run once in Supabase SQL Editor to let administrators inspect and manage player inventory.
-- Sell credits 90% of an item's listed value, matching the site's regular sale commission.

create or replace function public.admin_get_player_inventory(p_player_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_username text;
  v_state jsonb;
  v_balance numeric(14, 2);
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select p.user_id, p.username into v_user_id, v_username
    from public.profiles p
   where p.player_id = p_player_id;
  if v_user_id is null then raise exception 'Player not found'; end if;

  select gs.state into v_state
    from public.game_states gs
   where gs.user_id = v_user_id;
  if v_state is null then raise exception 'Player game state not found'; end if;

  select w.balance into v_balance
    from public.wallets w
   where w.user_id = v_user_id;
  if v_balance is null then raise exception 'Player wallet not found'; end if;

  return jsonb_build_object(
    'player_id', p_player_id,
    'username', v_username,
    'balance', v_balance,
    'inventory', coalesce(v_state -> 'inventory', '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_get_player_inventory(bigint) from public, anon;
grant execute on function public.admin_get_player_inventory(bigint) to authenticated;

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
    v_sale_amount := round((v_item ->> 'price')::numeric * 0.90, 2);
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

notify pgrst, 'reload schema';
