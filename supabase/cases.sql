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

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_reason_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_reason_check
  check (reason in ('admin_grant', 'admin_debit', 'game_sale', 'game_purchase', 'case_open'));

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
  if jsonb_typeof(v_contents) <> 'array' or jsonb_array_length(v_contents) = 0 then
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

notify pgrst, 'reload schema';
