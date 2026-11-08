-- Run after schema.sql, skin-battles.sql, cases.sql,
-- battle-balance.sql, and admin-moderation.sql.
-- Resets demo money and player-owned inventory for one player or every account.

create or replace function public.admin_wipe_player_assets(p_player_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_user_ids uuid[];
  v_user_count integer := 0;
  v_balance_removed numeric := 0;
  v_inventory_items_removed bigint := 0;
  v_pending_rewards_removed bigint := 0;
  v_battles_cancelled integer := 0;
  v_username text;
begin
  if v_admin is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_player_id is null then
    select coalesce(pg_catalog.array_agg(p.user_id order by p.user_id), array[]::uuid[])
      into v_user_ids
      from public.profiles p;
  else
    select array[p.user_id], p.username
      into v_user_ids, v_username
      from public.profiles p
     where p.player_id = p_player_id;
    if v_user_ids is null then raise exception 'Player not found'; end if;
  end if;
  v_user_count := pg_catalog.cardinality(v_user_ids);

  if v_user_count = 0 then
    return pg_catalog.jsonb_build_object(
      'player_id', p_player_id,
      'username', v_username,
      'accounts_wiped', 0,
      'balance_removed', 0,
      'inventory_items_removed', 0,
      'pending_rewards_removed', 0,
      'battles_cancelled', 0
    );
  end if;

  perform p.user_id
    from public.profiles p
   where p.user_id = any(v_user_ids)
   order by p.user_id
   for update;
  perform b.id
    from public.skin_battles b
   where b.status = 'waiting'
     and (b.creator_user_id = any(v_user_ids) or b.guest_user_id = any(v_user_ids))
   order by b.id
   for update;
  perform w.user_id
    from public.wallets w
   where w.user_id = any(v_user_ids)
   order by w.user_id
   for update;
  perform gs.user_id
    from public.game_states gs
   where gs.user_id = any(v_user_ids)
   order by gs.user_id
   for update;

  select coalesce(pg_catalog.sum(w.balance), 0)
    into v_balance_removed
    from public.wallets w
   where w.user_id = any(v_user_ids);
  select coalesce(pg_catalog.sum(
           case when pg_catalog.jsonb_typeof(gs.state -> 'inventory') = 'array'
             then pg_catalog.jsonb_array_length(gs.state -> 'inventory') else 0 end
         ), 0)
    into v_inventory_items_removed
    from public.game_states gs
   where gs.user_id = any(v_user_ids);

  update public.skin_battles b
     set status = 'cancelled',
         bank_value = 0,
         balance_settled = case when b.battle_type = 'balance' then true else b.balance_settled end,
         completed_at = pg_catalog.now()
   where b.status = 'waiting'
     and (b.creator_user_id = any(v_user_ids) or b.guest_user_id = any(v_user_ids));
  get diagnostics v_battles_cancelled = row_count;

  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  select w.user_id, v_admin, -w.balance, 0, 'admin_debit'
    from public.wallets w
   where w.user_id = any(v_user_ids)
     and w.balance > 0;
  update public.wallets w
     set balance = 0, updated_at = pg_catalog.now()
   where w.user_id = any(v_user_ids)
     and w.balance <> 0;

  insert into public.game_states (user_id, state)
  select p.user_id, '{"inventory":[],"betId":null,"betItemIds":[],"targetName":null,"bestDrop":null}'::jsonb
    from public.profiles p
   where p.user_id = any(v_user_ids)
  on conflict (user_id) do nothing;
  update public.game_states gs
     set state = pg_catalog.jsonb_set(
                   pg_catalog.jsonb_set(
                     pg_catalog.jsonb_set(
                       pg_catalog.jsonb_set(
                         case when pg_catalog.jsonb_typeof(gs.state) = 'object' then gs.state else '{}'::jsonb end,
                         '{inventory}', '[]'::jsonb, true),
                       '{betId}', 'null'::jsonb, true),
                     '{betItemIds}', '[]'::jsonb, true),
                   '{targetName}', 'null'::jsonb, true),
         updated_at = pg_catalog.now()
   where gs.user_id = any(v_user_ids);

  delete from public.case_rewards r
   where r.user_id = any(v_user_ids)
     and r.status = 'pending';
  get diagnostics v_pending_rewards_removed = row_count;

  return pg_catalog.jsonb_build_object(
    'player_id', p_player_id,
    'username', v_username,
    'accounts_wiped', v_user_count,
    'balance_removed', v_balance_removed,
    'inventory_items_removed', v_inventory_items_removed,
    'pending_rewards_removed', v_pending_rewards_removed,
    'battles_cancelled', v_battles_cancelled
  );
end;
$$;

revoke all on function public.admin_wipe_player_assets(bigint) from public, anon;
grant execute on function public.admin_wipe_player_assets(bigint) to authenticated;

notify pgrst, 'reload schema';
