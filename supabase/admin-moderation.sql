-- Player status, inventory clear, suspension controls, and transaction limits.
-- Apply after schema.sql in Supabase SQL Editor. Safe to run again.

-- Publish only the rows that authenticated players are allowed to read through RLS.
do $$
declare
  v_table text;
begin
  if exists (
    select 1 from pg_catalog.pg_publication
     where pubname = 'supabase_realtime' and not puballtables
  ) then
    foreach v_table in array array['profiles', 'wallets', 'game_states'] loop
      if not exists (
        select 1 from pg_catalog.pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end;
$$;

alter table public.profiles
  add column if not exists suspended_until timestamptz,
  add column if not exists suspension_reason text;

drop function if exists public.admin_list_players();
create function public.admin_list_players()
returns table (
  user_id uuid,
  player_id bigint,
  username text,
  role text,
  promo_code text,
  balance numeric,
  suspended_until timestamptz,
  suspension_reason text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
    select p.user_id, p.player_id, p.username, p.role, p.promo_code, w.balance,
           p.suspended_until, p.suspension_reason
      from public.profiles p
      join public.wallets w on w.user_id = p.user_id
     order by p.player_id;
end;
$$;
revoke all on function public.admin_list_players() from public, anon;
grant execute on function public.admin_list_players() to authenticated;

create or replace function public.admin_set_player_suspension(
  p_player_id bigint,
  p_duration_minutes integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_username text;
  v_until timestamptz;
  v_reason text;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_duration_minutes is null or p_duration_minutes < 0 or p_duration_minutes > 525600 then
    raise exception 'Duration must be between 1 minute and 365 days, or zero to lift';
  end if;

  select p.user_id, p.username into v_target, v_username
    from public.profiles p where p.player_id = p_player_id for update;
  if v_target is null then raise exception 'Player not found'; end if;

  if p_duration_minutes = 0 then
    update public.profiles p
       set suspended_until = null, suspension_reason = null
     where p.user_id = v_target;
    return jsonb_build_object('player_id', p_player_id, 'username', v_username,
                              'suspended_until', null, 'suspension_reason', null);
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null or length(v_reason) > 300 then
    raise exception 'Suspension reason is required and must be at most 300 characters';
  end if;
  v_until := now() + make_interval(mins => p_duration_minutes);
  update public.profiles p
     set suspended_until = v_until, suspension_reason = v_reason
   where p.user_id = v_target;

  return jsonb_build_object('player_id', p_player_id, 'username', v_username,
                            'suspended_until', v_until, 'suspension_reason', v_reason);
end;
$$;
revoke all on function public.admin_set_player_suspension(bigint, integer, text) from public, anon;
grant execute on function public.admin_set_player_suspension(bigint, integer, text) to authenticated;

create or replace function public.admin_clear_player_inventory(p_player_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_username text;
  v_state jsonb;
  v_count integer;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select p.user_id, p.username into v_target, v_username
    from public.profiles p where p.player_id = p_player_id for update;
  if v_target is null then raise exception 'Player not found'; end if;

  insert into public.game_states(user_id, state)
  values (v_target, '{"inventory":[],"betId":null,"betItemIds":[],"targetName":null,"bestDrop":null}'::jsonb)
  on conflict (user_id) do nothing;
  select gs.state into v_state from public.game_states gs where gs.user_id = v_target for update;
  if jsonb_typeof(v_state -> 'inventory') = 'array' then
    v_count := jsonb_array_length(v_state -> 'inventory');
  else
    v_count := 0;
  end if;
  v_state := jsonb_set(coalesce(v_state, '{}'::jsonb), '{inventory}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{betId}', 'null'::jsonb, true);
  v_state := jsonb_set(v_state, '{betItemIds}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{targetName}', 'null'::jsonb, true);
  update public.game_states gs set state = v_state, updated_at = now() where gs.user_id = v_target;

  return jsonb_build_object('player_id', p_player_id, 'username', v_username,
                            'deleted_count', v_count);
end;
$$;
revoke all on function public.admin_clear_player_inventory(bigint) from public, anon;
grant execute on function public.admin_clear_player_inventory(bigint) to authenticated;

create or replace function public.block_suspended_player_mutations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;
  if auth.uid() is distinct from new.user_id and public.is_current_user_admin() then
    return new;
  end if;
  if exists (
    select 1 from public.profiles p
     where p.user_id = new.user_id and p.suspended_until > now()
  ) then
    raise exception 'Account is suspended' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists block_suspended_game_state_updates on public.game_states;
create trigger block_suspended_game_state_updates
before insert or update on public.game_states
for each row execute function public.block_suspended_player_mutations();

drop trigger if exists block_suspended_wallet_updates on public.wallets;
create trigger block_suspended_wallet_updates
before insert or update on public.wallets
for each row execute function public.block_suspended_player_mutations();

create or replace function public.admin_grant_demo_credits(
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
  v_promo text;
  v_amount numeric(14, 2);
  v_bonus numeric(14, 2) := 0;
  v_balance numeric(14, 2);
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000000 then
    raise exception 'Amount must be between 0.01 and 1000000000';
  end if;
  v_amount := round(p_amount, 2);

  select p.user_id, p.username, p.promo_code into v_target, v_username, v_promo
    from public.profiles p where p.player_id = p_player_id for update;
  if v_target is null then raise exception 'Player not found'; end if;
  if v_promo = 'SGRADER' then v_bonus := round(v_amount * 0.10, 2); end if;

  update public.wallets w set balance = w.balance + v_amount + v_bonus, updated_at = now()
   where w.user_id = v_target returning w.balance into v_balance;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_target, auth.uid(), v_amount, v_bonus, 'admin_grant');

  return jsonb_build_object('player_id', p_player_id, 'username', v_username,
                            'amount', v_amount, 'bonus', v_bonus, 'balance', v_balance);
end;
$$;
revoke all on function public.admin_grant_demo_credits(bigint, numeric) from public, anon;
grant execute on function public.admin_grant_demo_credits(bigint, numeric) to authenticated;

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
  if p_amount is null or p_amount <= 0 or p_amount > 1000000000 then
    raise exception 'Amount must be between 0.01 and 1000000000';
  end if;
  v_amount := round(p_amount, 2);
  if v_amount <= 0 then raise exception 'Amount must be at least 0.01'; end if;

  select p.user_id, p.username into v_target, v_username
    from public.profiles p where p.player_id = p_player_id for update;
  if v_target is null then raise exception 'Player not found'; end if;
  select w.balance into v_balance from public.wallets w where w.user_id = v_target for update;
  if v_balance is null then raise exception 'Player wallet not found'; end if;
  if v_balance < v_amount then raise exception 'Insufficient balance' using errcode = '22023'; end if;

  update public.wallets w set balance = w.balance - v_amount, updated_at = now()
   where w.user_id = v_target returning w.balance into v_balance;
  insert into public.wallet_transactions (user_id, actor_user_id, amount, bonus, reason)
  values (v_target, auth.uid(), -v_amount, 0, 'admin_debit');

  return jsonb_build_object('player_id', p_player_id, 'username', v_username,
                            'amount', v_amount, 'balance', v_balance);
end;
$$;
revoke all on function public.admin_debit_demo_credits(bigint, numeric) from public, anon;
grant execute on function public.admin_debit_demo_credits(bigint, numeric) to authenticated;

notify pgrst, 'reload schema';
