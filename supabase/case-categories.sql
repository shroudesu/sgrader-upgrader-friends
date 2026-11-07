-- Persisted categories for shared demo cases.
-- Run once in Supabase Dashboard -> SQL Editor after cases.sql.

create table if not exists public.game_case_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 32),
  created_at timestamptz not null default now()
);

alter table public.game_cases
  add column if not exists category_id uuid references public.game_case_categories(id) on delete set null;

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
  insert into public.game_case_categories(name) values (v_name) returning id into v_id;
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
begin
  if p_category_id is not null and not exists (
    select 1 from public.game_case_categories where id = p_category_id
  ) then
    raise exception 'Case category not found';
  end if;

  v_result := public.admin_save_game_case(p_case_id, p_name, p_price, p_image_url, p_contents);
  v_id := (v_result ->> 'id')::uuid;
  update public.game_cases set category_id = p_category_id where id = v_id;
  return v_result || jsonb_build_object('category_id', p_category_id);
end;
$$;

revoke all on function public.admin_save_game_case(uuid, text, numeric, text, jsonb, uuid) from public, anon;
grant execute on function public.admin_save_game_case(uuid, text, numeric, text, jsonb, uuid) to authenticated;

notify pgrst, 'reload schema';
