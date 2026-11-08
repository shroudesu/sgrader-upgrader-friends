-- Persisted upgrader rolls and the optional five-stage golden bonus.
-- Run after schema.sql and community-features.sql in Supabase SQL Editor.

create table if not exists public.skin_upgrade_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('base_pending', 'bonus_ready', 'bonus_pending', 'complete')),
  outcome text check (outcome is null or outcome in ('win', 'bonus', 'lose', 'hit', 'miss')),
  stage integer not null default 0 check (stage between 0 and 5),
  initial_item jsonb not null,
  current_item jsonb not null,
  target_item jsonb,
  base_chance numeric(7,4) not null check (base_chance between 0 and 100),
  bonus_chance numeric(7,4) not null default 0 check (bonus_chance between 0 and 100),
  visual_start_angle numeric not null default 0,
  visual_end_angle numeric not null default 0,
  spin_duration_ms integer not null default 4200 check (spin_duration_ms between 4200 and 9000),
  spin_started_at timestamptz not null default now(),
  awarded_item jsonb,
  award_kind text check (award_kind is null or award_kind in ('win', 'return')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists skin_upgrade_runs_one_active_per_user
  on public.skin_upgrade_runs (user_id)
  where status <> 'complete';

create index if not exists skin_upgrade_runs_user_created_idx
  on public.skin_upgrade_runs (user_id, created_at desc);

alter table public.skin_upgrade_runs enable row level security;
revoke all on table public.skin_upgrade_runs from public, anon, authenticated;
grant select on table public.skin_upgrade_runs to authenticated;

drop policy if exists skin_upgrade_runs_read_self on public.skin_upgrade_runs;
create policy skin_upgrade_runs_read_self on public.skin_upgrade_runs
  for select to authenticated using (user_id = (select auth.uid()));

-- Filter consumed wagers from client-side snapshots, including stale tabs and
-- saves racing the final settlement. Trusted RPCs run as the function owner.
create or replace function public.guard_game_state_during_upgrade()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_inventory jsonb;
  v_active boolean;
begin
  if current_user = 'authenticated' and new.state is distinct from old.state then
    select coalesce(jsonb_agg(entry.item order by entry.ordinality), '[]'::jsonb)
      into v_inventory
      from jsonb_array_elements(coalesce(new.state -> 'inventory', '[]'::jsonb))
        with ordinality as entry(item, ordinality)
     where not exists (
       select 1 from public.skin_upgrade_runs as runs
        where runs.user_id = new.user_id
          and runs.initial_item ->> 'instanceId' = entry.item ->> 'instanceId'
          and (runs.status <> 'complete' or runs.award_kind is distinct from 'return')
     );
    new.state := jsonb_set(new.state, '{inventory}', v_inventory, true);
    select exists (
      select 1 from public.skin_upgrade_runs as runs
       where runs.user_id = new.user_id and runs.status <> 'complete'
    ) into v_active;
    if v_active then
      new.state := jsonb_set(new.state, '{betItemIds}', '[]'::jsonb, true);
      new.state := jsonb_set(new.state, '{betId}', 'null'::jsonb, true);
      new.state := jsonb_set(new.state, '{targetName}', 'null'::jsonb, true);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists game_state_guard_during_upgrade on public.game_states;
create trigger game_state_guard_during_upgrade
before update on public.game_states
for each row execute function public.guard_game_state_during_upgrade();

create or replace function public.record_skin_upgrade_award(p_user_id uuid, p_item jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_avatar text;
  v_instance_id text;
begin
  if p_item is null then return; end if;
  v_instance_id := nullif(p_item ->> 'instanceId', '');
  if v_instance_id is null then return; end if;

  select * into v_profile from public.profiles where user_id = p_user_id;
  if not found then return; end if;
  select nullif(state ->> 'avatar', '') into v_avatar
    from public.game_states where user_id = p_user_id;

  insert into public.upgrade_wins (user_id, instance_id, player_id, username, avatar, item)
  values (
    p_user_id,
    v_instance_id,
    v_profile.player_id,
    v_profile.username,
    v_avatar,
    jsonb_build_object(
      'name', p_item ->> 'name',
      'price', (p_item ->> 'price')::numeric(14, 2),
      'img', p_item ->> 'img',
      'wear', p_item ->> 'wear',
      'stattrak', coalesce(p_item -> 'stattrak' = 'true'::jsonb, false),
      'souvenir', coalesce(p_item -> 'souvenir' = 'true'::jsonb, false),
      'rarity', p_item -> 'rarity'
    )
  ) on conflict (user_id, instance_id) do nothing;
end;
$$;

revoke all on function public.record_skin_upgrade_award(uuid, jsonb) from public, anon, authenticated;

create or replace function public.begin_skin_upgrade(
  p_inventory_item_id text,
  p_target_item jsonb,
  p_spin_strength integer default 5,
  p_spin_mode text default 'fast'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state jsonb;
  v_inventory jsonb;
  v_initial_item jsonb;
  v_target_item jsonb;
  v_base_price numeric;
  v_target_price numeric;
  v_base_chance numeric;
  v_bonus_chance numeric;
  v_roll numeric;
  v_outcome text;
  v_win_angle numeric;
  v_bonus_angle numeric;
  v_lose_angle numeric;
  v_final_angle numeric;
  v_full_spins integer;
  v_duration integer;
  v_run public.skin_upgrade_runs%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if nullif(trim(coalesce(p_inventory_item_id, '')), '') is null then
    raise exception 'Choose a skin from inventory';
  end if;
  if jsonb_typeof(p_target_item) <> 'object' then raise exception 'Upgrade target is invalid'; end if;

  select state into v_state from public.game_states where user_id = v_user_id for update;
  if v_state is null then raise exception 'Game state not found'; end if;
  select * into v_run from public.skin_upgrade_runs
   where user_id = v_user_id and status <> 'complete' for update;
  if found then return to_jsonb(v_run); end if;

  select entry.item into v_initial_item
    from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb)) as entry(item)
   where entry.item ->> 'instanceId' = p_inventory_item_id
   limit 1;
  if v_initial_item is null then raise exception 'Wager is no longer in inventory'; end if;

  v_target_item := p_target_item;
  v_base_price := (v_initial_item ->> 'price')::numeric;
  v_target_price := (v_target_item ->> 'price')::numeric;
  if v_base_price <= 0 or v_target_price <= v_base_price then
    raise exception 'Target must cost more than the wager';
  end if;
  if coalesce(v_target_item ->> 'id', v_target_item ->> 'catalogId')
     = coalesce(v_initial_item ->> 'catalogId', v_initial_item ->> 'id') then
    raise exception 'The same skin cannot be wager and target';
  end if;

  v_base_chance := round(least(100, (v_base_price / v_target_price) * 100), 4);
  if v_base_chance < 0.01 then raise exception 'Upgrade chance is below 0.01 percent'; end if;
  v_bonus_chance := case
    when v_base_price > 50000 and v_base_chance between 10 and 95 then 5
    else 0
  end;
  v_roll := random() * 100;
  if v_roll < v_base_chance then
    v_outcome := 'win';
  elsif v_roll < v_base_chance + v_bonus_chance then
    v_outcome := 'bonus';
  else
    v_outcome := 'lose';
  end if;

  v_win_angle := v_base_chance * 3.6;
  v_bonus_angle := v_bonus_chance * 3.6;
  if v_outcome = 'win' then
    if v_bonus_angle > 0 then
      -- Golden 5% stays at bottom-center. Normal wins occupy equal arcs on
      -- both sides, preserving the original centered chance bar visually.
      if random() < 0.5 then
        v_final_angle := mod(360::numeric - (v_win_angle + v_bonus_angle) / 2
          + random()::numeric * (v_win_angle / 2), 360::numeric);
      else
        v_final_angle := mod(v_bonus_angle / 2 + random()::numeric * (v_win_angle / 2), 360::numeric);
      end if;
    else
      v_final_angle := mod(360::numeric - v_win_angle / 2 + random()::numeric * v_win_angle, 360::numeric);
    end if;
  elsif v_outcome = 'bonus' then
    v_final_angle := mod(360::numeric - v_bonus_angle / 2 + random()::numeric * v_bonus_angle, 360::numeric);
  else
    if v_bonus_angle > 0 then
      v_lose_angle := greatest(0::numeric, 360::numeric - v_win_angle - v_bonus_angle);
      v_final_angle := mod((v_win_angle + v_bonus_angle) / 2
        + random()::numeric * v_lose_angle, 360::numeric);
    else
      v_final_angle := mod(v_win_angle / 2
        + random()::numeric * greatest(0::numeric, 360::numeric - v_win_angle), 360::numeric);
    end if;
  end if;
  v_full_spins := 2 + greatest(1, least(10, coalesce(p_spin_strength, 5))) + floor(random() * 3)::integer;
  v_duration := case when p_spin_mode = 'slow' then 9000 else 4200 end;

  select coalesce(jsonb_agg(entry.item order by entry.ordinality), '[]'::jsonb)
    into v_inventory
    from jsonb_array_elements(coalesce(v_state -> 'inventory', '[]'::jsonb))
      with ordinality as entry(item, ordinality)
   where entry.item ->> 'instanceId' <> p_inventory_item_id;
  v_state := jsonb_set(v_state, '{inventory}', v_inventory, true);
  v_state := jsonb_set(v_state, '{betItemIds}', '[]'::jsonb, true);
  v_state := jsonb_set(v_state, '{betId}', 'null'::jsonb, true);
  v_state := jsonb_set(v_state, '{targetName}', 'null'::jsonb, true);
  update public.game_states set state = v_state, updated_at = now() where user_id = v_user_id;

  insert into public.skin_upgrade_runs (
    user_id, status, outcome, stage, initial_item, current_item, target_item,
    base_chance, bonus_chance, visual_start_angle, visual_end_angle,
    spin_duration_ms, spin_started_at
  ) values (
    v_user_id, 'base_pending', v_outcome, 0, v_initial_item, v_initial_item, v_target_item,
    v_base_chance, v_bonus_chance, 0, v_final_angle + v_full_spins * 360,
    v_duration, clock_timestamp()
  ) returning * into v_run;
  return to_jsonb(v_run);
end;
$$;

revoke all on function public.begin_skin_upgrade(text, jsonb, integer, text) from public, anon;
grant execute on function public.begin_skin_upgrade(text, jsonb, integer, text) to authenticated;

create or replace function public.prepare_skin_upgrade_bonus(
  p_run_id uuid,
  p_candidates jsonb,
  p_spin_strength integer default 5,
  p_spin_mode text default 'fast'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state jsonb;
  v_inventory jsonb;
  v_run public.skin_upgrade_runs%rowtype;
  v_candidate jsonb;
  v_target jsonb;
  v_price numeric;
  v_stake_price numeric;
  v_odds numeric;
  v_win_angle numeric;
  v_start_angle numeric;
  v_final_angle numeric;
  v_delta numeric;
  v_full_spins integer;
  v_duration integer;
  v_index integer;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  select state into v_state from public.game_states where user_id = v_user_id for update;
  if v_state is null then raise exception 'Game state not found'; end if;
  select * into v_run from public.skin_upgrade_runs
   where id = p_run_id and user_id = v_user_id for update;
  if not found then raise exception 'Upgrade session not found'; end if;
  if v_run.status = 'bonus_pending' or v_run.status = 'complete' then return to_jsonb(v_run); end if;
  if v_run.status <> 'bonus_ready' then raise exception 'Bonus stage is not ready'; end if;
  if jsonb_typeof(p_candidates) <> 'array' then raise exception 'Candidate list is invalid'; end if;

  if jsonb_array_length(p_candidates) = 0 then
    v_inventory := coalesce(v_state -> 'inventory', '[]'::jsonb) || jsonb_build_array(v_run.current_item);
    v_state := jsonb_set(v_state, '{inventory}', v_inventory, true);
    v_state := jsonb_set(v_state, '{betItemIds}', '[]'::jsonb, true);
    v_state := jsonb_set(v_state, '{betId}', 'null'::jsonb, true);
    v_state := jsonb_set(v_state, '{targetName}', 'null'::jsonb, true);
    update public.game_states set state = v_state, updated_at = now() where user_id = v_user_id;
    update public.skin_upgrade_runs set status = 'complete', awarded_item = current_item,
      award_kind = case when stage > 1 then 'win' else 'return' end,
      completed_at = now(), outcome = null
     where id = p_run_id returning * into v_run;
    if v_run.award_kind = 'win' then
      if coalesce((v_state -> 'bestDrop' ->> 'price')::numeric, 0) < coalesce((v_run.awarded_item ->> 'price')::numeric, 0) then
        v_state := jsonb_set(v_state, '{bestDrop}', jsonb_build_object(
          'name', v_run.awarded_item ->> 'name', 'price', (v_run.awarded_item ->> 'price')::numeric,
          'img', v_run.awarded_item ->> 'img'), true);
        update public.game_states set state = v_state, updated_at = now() where user_id = v_user_id;
      end if;
      perform public.record_skin_upgrade_award(v_user_id, v_run.awarded_item);
    end if;
    return to_jsonb(v_run);
  end if;
  if jsonb_array_length(p_candidates) > 250 then raise exception 'Too many bonus candidates'; end if;
  if v_run.stage < 1 or v_run.stage > 5 then raise exception 'Bonus stage is invalid'; end if;

  v_stake_price := (v_run.current_item ->> 'price')::numeric;
  v_index := floor(random() * jsonb_array_length(p_candidates))::integer;
  v_candidate := p_candidates -> v_index;
  if jsonb_typeof(v_candidate) <> 'object' or v_candidate ->> 'catalogType' <> 'skin' then
    raise exception 'Bonus candidate must be a skin';
  end if;
  v_price := (v_candidate ->> 'price')::numeric;
  if v_price < v_stake_price * 1.5 or v_price > v_stake_price * 2.5 then
    raise exception 'Bonus target must be near twice the current wager';
  end if;
  if coalesce(v_candidate ->> 'id', '') = coalesce(v_run.current_item ->> 'catalogId', v_run.current_item ->> 'id', '') then
    raise exception 'Bonus target cannot repeat the wager skin';
  end if;

  v_target := jsonb_set(v_candidate, '{catalogId}', coalesce(v_candidate -> 'id', v_candidate -> 'catalogId'), true);
  v_target := jsonb_set(v_target, '{instanceId}', to_jsonb(gen_random_uuid()::text), true);
  v_odds := (array[50, 45, 40, 35, 15]::numeric[])[v_run.stage];
  v_run.outcome := case when random() * 100 < v_odds then 'hit' else 'miss' end;
  v_win_angle := v_odds * 3.6;
  v_start_angle := mod(v_run.visual_end_angle, 360);
  if v_run.outcome = 'hit' then
    v_final_angle := mod(360::numeric - v_win_angle / 2 + random()::numeric * v_win_angle, 360::numeric);
  else
    v_final_angle := mod(v_win_angle / 2 + random()::numeric * (360::numeric - v_win_angle), 360::numeric);
  end if;
  v_delta := mod(v_final_angle - v_start_angle + 360, 360);
  v_full_spins := 2 + greatest(1, least(10, coalesce(p_spin_strength, 5))) + floor(random() * 3)::integer;
  v_duration := case when p_spin_mode = 'slow' then 9000 else 4200 end;

  update public.skin_upgrade_runs set status = 'bonus_pending', outcome = v_run.outcome,
    target_item = v_target, bonus_chance = v_odds, visual_start_angle = v_start_angle,
    visual_end_angle = v_start_angle + v_delta + v_full_spins * 360,
    spin_duration_ms = v_duration, spin_started_at = clock_timestamp()
   where id = p_run_id returning * into v_run;
  return to_jsonb(v_run);
end;
$$;

revoke all on function public.prepare_skin_upgrade_bonus(uuid, jsonb, integer, text) from public, anon;
grant execute on function public.prepare_skin_upgrade_bonus(uuid, jsonb, integer, text) to authenticated;

create or replace function public.settle_skin_upgrade(p_run_id uuid, p_expected_stage integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_state jsonb;
  v_inventory jsonb;
  v_run public.skin_upgrade_runs%rowtype;
  v_award jsonb;
  v_award_kind text;
  v_complete boolean := false;
  v_is_new_prize boolean := false;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  select state into v_state from public.game_states where user_id = v_user_id for update;
  if v_state is null then raise exception 'Game state not found'; end if;
  select * into v_run from public.skin_upgrade_runs
   where id = p_run_id and user_id = v_user_id for update;
  if not found then raise exception 'Upgrade session not found'; end if;
  if v_run.status = 'complete' then return to_jsonb(v_run); end if;
  -- Never settle a roll before its persisted animation duration has elapsed.
  -- Waiting here also avoids relying on the browser clock after a refresh.
  if clock_timestamp() < v_run.spin_started_at + (v_run.spin_duration_ms * interval '1 millisecond') then
    perform pg_sleep(extract(epoch from (
      v_run.spin_started_at + (v_run.spin_duration_ms * interval '1 millisecond') - clock_timestamp()
    )));
  end if;
  if (v_run.status = 'base_pending' and p_expected_stage <> 0)
     or (v_run.status = 'bonus_pending' and p_expected_stage <> v_run.stage)
     or v_run.status not in ('base_pending', 'bonus_pending') then
    return to_jsonb(v_run) || jsonb_build_object('stale', true);
  end if;

  if v_run.status = 'base_pending' and v_run.outcome = 'bonus' then
    update public.skin_upgrade_runs set status = 'bonus_ready', stage = 1, target_item = null
     where id = p_run_id returning * into v_run;
    return to_jsonb(v_run);
  end if;

  if v_run.status = 'base_pending' then
    if v_run.outcome = 'win' then
      v_award := jsonb_set(v_run.target_item, '{instanceId}', to_jsonb(gen_random_uuid()::text), true);
      v_award := jsonb_set(v_award, '{catalogId}', coalesce(v_run.target_item -> 'id', v_run.target_item -> 'catalogId'), true);
      v_award_kind := 'win';
      v_is_new_prize := true;
    end if;
    v_complete := true;
  elsif v_run.outcome = 'hit' and v_run.stage < 5 then
    update public.skin_upgrade_runs set status = 'bonus_ready', stage = stage + 1,
      current_item = target_item, target_item = null, outcome = null
     where id = p_run_id returning * into v_run;
    return to_jsonb(v_run);
  elsif v_run.outcome = 'hit' then
    v_award := v_run.target_item;
    v_award_kind := 'win';
    v_is_new_prize := true;
    v_complete := true;
  elsif v_run.outcome = 'miss' then
    v_award := v_run.current_item;
    v_award_kind := case when v_run.stage = 1 then 'return' else 'win' end;
    v_is_new_prize := v_run.stage > 1;
    v_complete := true;
  else
    v_complete := true;
  end if;

  if v_complete then
    v_inventory := coalesce(v_state -> 'inventory', '[]'::jsonb);
    if v_award is not null then v_inventory := v_inventory || jsonb_build_array(v_award); end if;
    v_state := jsonb_set(v_state, '{inventory}', v_inventory, true);
    v_state := jsonb_set(v_state, '{betItemIds}', '[]'::jsonb, true);
    v_state := jsonb_set(v_state, '{betId}', 'null'::jsonb, true);
    v_state := jsonb_set(v_state, '{targetName}', 'null'::jsonb, true);

    if v_is_new_prize and coalesce((v_state -> 'bestDrop' ->> 'price')::numeric, 0) < coalesce((v_award ->> 'price')::numeric, 0) then
      v_state := jsonb_set(v_state, '{bestDrop}', jsonb_build_object(
        'name', v_award ->> 'name', 'price', (v_award ->> 'price')::numeric,
        'img', v_award ->> 'img'), true);
    end if;
    update public.game_states set state = v_state, updated_at = now() where user_id = v_user_id;

    update public.skin_upgrade_runs set status = 'complete', awarded_item = v_award,
      award_kind = v_award_kind, completed_at = now()
     where id = p_run_id returning * into v_run;
    if v_is_new_prize and v_award is not null then
      perform public.record_skin_upgrade_award(v_user_id, v_award);
    end if;
  end if;
  return to_jsonb(v_run);
end;
$$;

revoke all on function public.settle_skin_upgrade(uuid, integer) from public, anon;
grant execute on function public.settle_skin_upgrade(uuid, integer) to authenticated;

create or replace function public.get_active_skin_upgrade()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select to_jsonb(runs) from public.skin_upgrade_runs as runs
     where runs.user_id = auth.uid() and runs.status <> 'complete'
     order by runs.created_at desc limit 1
  ), 'null'::jsonb);
$$;

revoke all on function public.get_active_skin_upgrade() from public, anon;
grant execute on function public.get_active_skin_upgrade() to authenticated;

notify pgrst, 'reload schema';
