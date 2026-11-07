-- Global custom catalog skins, private per-player battle archive hiding,
-- and a shared server clock for the site-wide music playlist.
-- Run once in Supabase Dashboard -> SQL Editor.

create table if not exists public.custom_catalog_skins (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  price numeric(14, 2) not null check (price > 0 and price <= 1000000000),
  quality text not null check (char_length(quality) between 1 and 40),
  quality_color text not null check (quality_color ~ '^#[0-9A-Fa-f]{6}$'),
  image_url text not null check (char_length(image_url) <= 2048),
  image_path text not null check (char_length(image_path) <= 512),
  created_at timestamptz not null default now()
);

create index if not exists custom_catalog_skins_created_at_idx
  on public.custom_catalog_skins (created_at desc);

alter table public.custom_catalog_skins enable row level security;
revoke all on table public.custom_catalog_skins from public, anon, authenticated;
grant select on table public.custom_catalog_skins to anon, authenticated;

drop policy if exists custom_catalog_skins_read on public.custom_catalog_skins;
create policy custom_catalog_skins_read on public.custom_catalog_skins
  for select to anon, authenticated using (true);

drop policy if exists custom_catalog_skins_admin_insert on public.custom_catalog_skins;
create policy custom_catalog_skins_admin_insert on public.custom_catalog_skins
  for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_current_user_admin());

drop policy if exists custom_catalog_skins_admin_update on public.custom_catalog_skins;
create policy custom_catalog_skins_admin_update on public.custom_catalog_skins
  for update to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists custom_catalog_skins_admin_delete on public.custom_catalog_skins;
create policy custom_catalog_skins_admin_delete on public.custom_catalog_skins
  for delete to authenticated using (public.is_current_user_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('custom-skin-images', 'custom-skin-images', true, 5242880, array['image/png','image/jpeg','image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists custom_skin_images_admin_upload on storage.objects;
create policy custom_skin_images_admin_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'custom-skin-images' and public.is_current_user_admin());

drop policy if exists custom_skin_images_admin_update on storage.objects;
create policy custom_skin_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'custom-skin-images' and public.is_current_user_admin())
  with check (bucket_id = 'custom-skin-images' and public.is_current_user_admin());

drop policy if exists custom_skin_images_admin_delete on storage.objects;
create policy custom_skin_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'custom-skin-images' and public.is_current_user_admin());

-- Return Supabase's database clock. Clients use it to resume the same playlist
-- position after refresh and to remain aligned despite local clock drift.
create or replace function public.get_site_music_clock()
returns timestamptz
language sql
volatile
security definer
set search_path = ''
as $$
  select pg_catalog.clock_timestamp();
$$;

revoke all on function public.get_site_music_clock() from public;
grant execute on function public.get_site_music_clock() to anon, authenticated;

-- Hiding an archive is per-player, so clearing one user's archive never deletes
-- the same completed battle from the other participant's archive.
create table if not exists public.skin_battle_archive_hidden (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  battle_id uuid not null references public.skin_battles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, battle_id)
);

alter table public.skin_battle_archive_hidden enable row level security;
revoke all on table public.skin_battle_archive_hidden from public, anon, authenticated;
grant select on table public.skin_battle_archive_hidden to authenticated;

drop policy if exists skin_battle_archive_hidden_read_self on public.skin_battle_archive_hidden;
create policy skin_battle_archive_hidden_read_self on public.skin_battle_archive_hidden
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.clear_my_skin_battle_archive()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_hidden_count integer := 0;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;

  insert into public.skin_battle_archive_hidden (user_id, battle_id, hidden_at)
  select v_user_id, battle.id, pg_catalog.clock_timestamp()
    from public.skin_battles as battle
   where (battle.creator_user_id = v_user_id or battle.guest_user_id = v_user_id)
     and battle.status in ('completed', 'cancelled')
  on conflict (user_id, battle_id) do update
    set hidden_at = excluded.hidden_at;

  get diagnostics v_hidden_count = row_count;
  return v_hidden_count;
end;
$$;

revoke all on function public.clear_my_skin_battle_archive() from public, anon;
grant execute on function public.clear_my_skin_battle_archive() to authenticated;

notify pgrst, 'reload schema';
