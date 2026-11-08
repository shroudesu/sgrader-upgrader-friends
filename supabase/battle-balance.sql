-- Add a separate 50/50 balance-battle mode to an existing SGRADER UP database.
-- Run after skin-battles.sql and cases.sql. Stake transfers happen only in RPCs.

alter table public.skin_battles
  add column if not exists battle_type text not null default 'skins',
  add column if not exists creator_cash_stake numeric(14, 2),
  add column if not exists guest_cash_stake numeric(14, 2),
  add column if not exists balance_settled boolean not null default false;

alter table public.skin_battles
  drop constraint if exists skin_battles_battle_type_check,
  drop constraint if exists skin_battles_creator_cash_stake_check,
  drop constraint if exists skin_battles_guest_cash_stake_check,
  drop constraint if exists skin_battles_cash_mode_check,
  drop constraint if exists skin_battles_cash_settled_check;

alter table public.skin_battles
  add constraint skin_battles_battle_type_check
    check (battle_type in ('skins', 'balance')),
  add constraint skin_battles_creator_cash_stake_check
    check (creator_cash_stake is null or creator_cash_stake >= 100),
  add constraint skin_battles_guest_cash_stake_check
    check (guest_cash_stake is null or guest_cash_stake >= 100),
  add constraint skin_battles_cash_mode_check
    check (
      (battle_type = 'skins' and creator_cash_stake is null and guest_cash_stake is null and not balance_settled)
      or (battle_type = 'balance' and creator_cash_stake is not null)
    ),
  add constraint skin_battles_cash_settled_check
    check (battle_type <> 'balance' or status not in ('completed', 'cancelled') or balance_settled);

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_reason_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_reason_check
  check (reason in (
    'admin_grant', 'admin_debit', 'game_sale', 'game_purchase', 'case_open',
    'battle_stake', 'battle_prize', 'battle_refund', 'upgrade_bonus_cash'
  ));

create or replace function public.create_balance_battle(p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount numeric(14, 2);
  v_balance numeric(14, 2);
  v_username text;
  v_battle_id uuid;
begin
  if v_user_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_amount is null or p_amount < 100 or p_amount > 1000000000 then
    raise exception 'Balance battle stake must be between 100 and 1000000000';
  end if;
  v_amount := round(p_amount, 2);
  if v_amount < 100 then raise exception 'Balance battle stake must be at least 100'; end if;

  select w.balance into v_balance
    from public.wallets w
   where w.user_id = v_user_id
   for update;
  if not found then raise exception 'Player wallet not found'; end if;
  if v_balance < v_amount then raise exception 'Insufficient balance' using errcode = '22023'; end if;

  select p.username into v_username
    from public.profiles p
   where p.user_id = v_user_id;
  if v_username is null then raise exception 'Player profile not found'; end if;

  update public.wallets
     set balance = balance - v_amount, updated_at = now()
   where user_id = v_user_id;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_user_id, v_user_id, -v_amount, 0, 'battle_stake');

  insert into public.skin_battles (
    creator_user_id, creator_name, creator_skin, guest_skin,
    battle_type, creator_cash_stake, bank_value, status
  ) values (
    v_user_id, v_username, '[]'::jsonb, '[]'::jsonb,
    'balance', v_amount, v_amount, 'waiting'
  ) returning id into v_battle_id;

  return v_battle_id;
end;
$$;

revoke all on function public.create_balance_battle(numeric) from public, anon;
grant execute on function public.create_balance_battle(numeric) to authenticated;

create or replace function public.join_balance_battle(p_battle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_battle public.skin_battles%rowtype;
  v_guest_balance numeric(14, 2);
  v_guest_name text;
  v_stake numeric(14, 2);
  v_bank numeric(14, 2);
  v_winner_side text;
  v_winner_id uuid;
  v_winner_name text;
begin
  if v_user_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;

  select b.* into v_battle
    from public.skin_battles b
   where b.id = p_battle_id
   for update;
  if not found or v_battle.status <> 'waiting' then raise exception 'Battle has already started'; end if;
  if v_battle.battle_type <> 'balance' then raise exception 'This is a skin battle'; end if;
  if v_battle.creator_user_id = v_user_id then raise exception 'Creator cannot join their own battle'; end if;

  v_stake := v_battle.creator_cash_stake;
  if v_stake is null or v_stake < 100 then raise exception 'Balance battle stake is invalid'; end if;

  perform w.user_id
    from public.wallets w
   where w.user_id in (v_user_id, v_battle.creator_user_id)
   order by w.user_id
   for update;
  select w.balance into v_guest_balance
    from public.wallets w
   where w.user_id = v_user_id;
  if v_guest_balance is null then raise exception 'Player wallet not found'; end if;
  if v_guest_balance < v_stake then raise exception 'Insufficient balance' using errcode = '22023'; end if;

  select p.username into v_guest_name
    from public.profiles p
   where p.user_id = v_user_id;
  if v_guest_name is null then raise exception 'Player profile not found'; end if;

  update public.wallets
     set balance = balance - v_stake, updated_at = now()
   where user_id = v_user_id;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_user_id, v_user_id, -v_stake, 0, 'battle_stake');

  v_bank := v_stake * 2;
  v_winner_side := case when pg_catalog.random() < 0.5 then 'creator' else 'guest' end;
  if v_winner_side = 'creator' then
    v_winner_id := v_battle.creator_user_id;
    v_winner_name := v_battle.creator_name;
  else
    v_winner_id := v_user_id;
    v_winner_name := v_guest_name;
  end if;

  update public.wallets
     set balance = balance + v_bank, updated_at = now()
   where user_id = v_winner_id;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_winner_id, v_user_id, v_bank, 0, 'battle_prize');

  update public.skin_battles
     set guest_user_id = v_user_id,
         guest_name = v_guest_name,
         guest_cash_stake = v_stake,
         status = 'completed',
         winner_user_id = v_winner_id,
         winner_name = v_winner_name,
         winner_side = v_winner_side,
         bank_value = v_bank,
         balance_settled = true,
         completed_at = now()
   where id = p_battle_id;

  return jsonb_build_object(
    'id', p_battle_id,
    'status', 'completed',
    'battle_type', 'balance',
    'creator_user_id', v_battle.creator_user_id,
    'creator_name', v_battle.creator_name,
    'creator_skin', '[]'::jsonb,
    'creator_cash_stake', v_stake,
    'guest_user_id', v_user_id,
    'guest_name', v_guest_name,
    'guest_skin', '[]'::jsonb,
    'guest_cash_stake', v_stake,
    'winner_user_id', v_winner_id,
    'winner_name', v_winner_name,
    'winner_side', v_winner_side,
    'bank_value', v_bank
  );
end;
$$;

revoke all on function public.join_balance_battle(uuid) from public, anon;
grant execute on function public.join_balance_battle(uuid) to authenticated;

create or replace function public.cancel_balance_battle(p_battle_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_battle public.skin_battles%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in required' using errcode = '42501'; end if;

  select b.* into v_battle
    from public.skin_battles b
   where b.id = p_battle_id
   for update;
  if not found or v_battle.status <> 'waiting' or v_battle.battle_type <> 'balance' then
    raise exception 'Balance battle cannot be cancelled';
  end if;
  if v_battle.creator_user_id <> v_user_id then raise exception 'Only the creator can cancel this battle'; end if;

  perform 1
    from public.wallets w
   where w.user_id = v_user_id
   for update;
  if not found then raise exception 'Player wallet not found'; end if;

  update public.wallets
     set balance = balance + v_battle.creator_cash_stake, updated_at = now()
   where user_id = v_user_id;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_user_id, v_user_id, v_battle.creator_cash_stake, 0, 'battle_refund');

  update public.skin_battles
     set status = 'cancelled', bank_value = 0, balance_settled = true, completed_at = now()
   where id = p_battle_id;
  return true;
end;
$$;

revoke all on function public.cancel_balance_battle(uuid) from public, anon;
grant execute on function public.cancel_balance_battle(uuid) to authenticated;

notify pgrst, 'reload schema';
