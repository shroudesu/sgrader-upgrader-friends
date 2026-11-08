-- Global manual catalog prices. Admin overrides always take priority over Skinport.
-- Run once in Supabase Dashboard -> SQL Editor after schema.sql.

create table if not exists public.market_price_overrides (
  market_hash_name text primary key
    check (char_length(market_hash_name) between 2 and 180),
  price numeric(14, 2) not null
    check (price > 0 and price <= 1000000000),
  updated_by uuid not null references public.profiles(user_id) on delete restrict,
  updated_at timestamptz not null default now()
);

create or replace function public.set_market_price_override_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_market_price_override_updated_at() from public, anon, authenticated;

drop trigger if exists market_price_overrides_updated_at on public.market_price_overrides;
create trigger market_price_overrides_updated_at
  before update on public.market_price_overrides
  for each row execute function public.set_market_price_override_updated_at();

alter table public.market_price_overrides enable row level security;
revoke all on table public.market_price_overrides from public, anon, authenticated;
grant select on table public.market_price_overrides to anon, authenticated;
grant insert, update, delete on table public.market_price_overrides to authenticated;

drop policy if exists market_price_overrides_read on public.market_price_overrides;
create policy market_price_overrides_read on public.market_price_overrides
  for select to anon, authenticated using (true);

drop policy if exists market_price_overrides_admin_insert on public.market_price_overrides;
create policy market_price_overrides_admin_insert on public.market_price_overrides
  for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and public.is_current_user_admin()
  );

drop policy if exists market_price_overrides_admin_update on public.market_price_overrides;
create policy market_price_overrides_admin_update on public.market_price_overrides
  for update to authenticated
  using (public.is_current_user_admin())
  with check (
    updated_by = (select auth.uid())
    and public.is_current_user_admin()
  );

drop policy if exists market_price_overrides_admin_delete on public.market_price_overrides;
create policy market_price_overrides_admin_delete on public.market_price_overrides
  for delete to authenticated using (public.is_current_user_admin());

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication
     where pubname = 'supabase_realtime' and not puballtables
  ) and not exists (
    select 1 from pg_catalog.pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'market_price_overrides'
  ) then
    alter publication supabase_realtime add table public.market_price_overrides;
  end if;
end;
$$;
