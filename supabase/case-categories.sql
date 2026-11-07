-- Persisted categories for shared demo cases.
-- Run once in Supabase Dashboard -> SQL Editor after cases.sql.

create table if not exists public.game_case_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 32),
  created_at timestamptz not null default now()
);

alter table public.game_cases
  add column if not exists category_id uuid references public.game_case_categories(id) on delete set null;

alter table public.game_case_categories add column if not exists sort_order integer;
alter table public.game_cases add column if not exists sort_order integer;

with ordered as (
  select id, row_number() over (order by name, id)::integer as position
    from public.game_case_categories
   where sort_order is null
)
update public.game_case_categories as categories
   set sort_order = ordered.position
  from ordered
 where categories.id = ordered.id;

with ordered as (
  select id, row_number() over (
    partition by category_id order by price, created_at, id
  )::integer as position
    from public.game_cases
   where sort_order is null
)
update public.game_cases as cases
   set sort_order = ordered.position
  from ordered
 where cases.id = ordered.id;

alter table public.game_case_categories alter column sort_order set default 1;
alter table public.game_case_categories alter column sort_order set not null;
alter table public.game_cases alter column sort_order set default 1;
alter table public.game_cases alter column sort_order set not null;
create index if not exists game_case_categories_sort_order_idx on public.game_case_categories (sort_order, name);
create index if not exists game_cases_category_sort_order_idx on public.game_cases (category_id, sort_order, name);

alter table public.game_case_categories enable row level security;
revoke all on table public.game_case_categories from public, anon, authenticated;
grant select on table public.game_case_categories to authenticated;

drop policy if exists game_case_categories_read_authenticated on public.game_case_categories;
create policy game_case_categories_read_authenticated on public.game_case_categories
  for select to authenticated using (true);

create or replace function public.admin_create_game_case_category(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 32 then
    raise exception 'Category name must contain 2 to 32 characters';
  end if;
  insert into public.game_case_categories(name, sort_order)
  values (v_name, coalesce((select max(sort_order) + 1 from public.game_case_categories), 1))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.admin_create_game_case_category(text) from public, anon;
grant execute on function public.admin_create_game_case_category(text) to authenticated;

create or replace function public.admin_delete_game_case_category(p_category_id uuid)
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
  delete from public.game_case_categories where id = p_category_id returning true into v_deleted;
  if v_deleted is null then raise exception 'Category not found'; end if;
  with ordered as (
    select id, row_number() over (order by sort_order, name, id)::integer as position
      from public.game_cases where category_id is null
  )
  update public.game_cases as cases set sort_order = ordered.position
    from ordered where cases.id = ordered.id;
  return v_deleted;
end;
$$;

revoke all on function public.admin_delete_game_case_category(uuid) from public, anon;
grant execute on function public.admin_delete_game_case_category(uuid) to authenticated;

-- Add a category-aware overload while retaining the original 5-argument RPC
-- for any already deployed clients. The existing save function performs all
-- admin checks and validates prices, contents, and odds before this update.
create or replace function public.admin_save_game_case(
  p_case_id uuid,
  p_name text,
  p_price numeric,
  p_image_url text,
  p_contents jsonb,
  p_category_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_id uuid;
  v_old_category uuid;
  v_next_order integer;
begin
  if p_category_id is not null and not exists (
    select 1 from public.game_case_categories where id = p_category_id
  ) then
    raise exception 'Case category not found';
  end if;

  if p_case_id is not null then
    select category_id into v_old_category from public.game_cases where id = p_case_id;
  end if;
  v_result := public.admin_save_game_case(p_case_id, p_name, p_price, p_image_url, p_contents);
  v_id := (v_result ->> 'id')::uuid;
  if p_case_id is null or v_old_category is distinct from p_category_id then
    select coalesce(max(sort_order), 0) + 1 into v_next_order
      from public.game_cases where category_id is not distinct from p_category_id and id <> v_id;
    update public.game_cases set category_id = p_category_id, sort_order = v_next_order where id = v_id;
  else
    update public.game_cases set category_id = p_category_id where id = v_id;
  end if;
  return v_result || jsonb_build_object('category_id', p_category_id);
end;
$$;

revoke all on function public.admin_save_game_case(uuid, text, numeric, text, jsonb, uuid) from public, anon;
grant execute on function public.admin_save_game_case(uuid, text, numeric, text, jsonb, uuid) to authenticated;

create or replace function public.admin_reorder_game_case_category(p_category_id uuid, p_direction text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order integer;
  v_neighbor_id uuid;
  v_neighbor_order integer;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then raise exception 'Direction must be up or down'; end if;
  perform pg_advisory_xact_lock(hashtext('game-case-category-order')::bigint);
  select sort_order into v_order from public.game_case_categories where id = p_category_id for update;
  if v_order is null then raise exception 'Category not found'; end if;
  if p_direction = 'up' then
    select id, sort_order into v_neighbor_id, v_neighbor_order from public.game_case_categories
      where sort_order < v_order order by sort_order desc, name desc limit 1 for update;
  else
    select id, sort_order into v_neighbor_id, v_neighbor_order from public.game_case_categories
      where sort_order > v_order order by sort_order asc, name asc limit 1 for update;
  end if;
  if v_neighbor_id is null then return false; end if;
  update public.game_case_categories set sort_order = case
    when id = p_category_id then v_neighbor_order else v_order end
    where id in (p_category_id, v_neighbor_id);
  return true;
end;
$$;

revoke all on function public.admin_reorder_game_case_category(uuid, text) from public, anon;
grant execute on function public.admin_reorder_game_case_category(uuid, text) to authenticated;

create or replace function public.admin_reorder_game_case(p_case_id uuid, p_direction text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order integer;
  v_category_id uuid;
  v_neighbor_id uuid;
  v_neighbor_order integer;
begin
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then raise exception 'Direction must be up or down'; end if;
  perform pg_advisory_xact_lock(hashtext('game-case-item-order')::bigint);
  select sort_order, category_id into v_order, v_category_id
    from public.game_cases where id = p_case_id for update;
  if v_order is null then raise exception 'Case not found'; end if;
  if p_direction = 'up' then
    select id, sort_order into v_neighbor_id, v_neighbor_order from public.game_cases
      where category_id is not distinct from v_category_id and sort_order < v_order
      order by sort_order desc, name desc limit 1 for update;
  else
    select id, sort_order into v_neighbor_id, v_neighbor_order from public.game_cases
      where category_id is not distinct from v_category_id and sort_order > v_order
      order by sort_order asc, name asc limit 1 for update;
  end if;
  if v_neighbor_id is null then return false; end if;
  update public.game_cases set sort_order = case
    when id = p_case_id then v_neighbor_order else v_order end
    where id in (p_case_id, v_neighbor_id);
  return true;
end;
$$;

revoke all on function public.admin_reorder_game_case(uuid, text) from public, anon;
grant execute on function public.admin_reorder_game_case(uuid, text) to authenticated;

notify pgrst, 'reload schema';
