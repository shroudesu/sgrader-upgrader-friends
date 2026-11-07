-- Run after community-features.sql to expose curated upgrade wins to logged-out visitors.
-- Player UUIDs are intentionally omitted from this anonymous feed response.

create or replace function public.get_upgrade_wins_feed()
returns table (
  id bigint,
  player_id bigint,
  username text,
  avatar text,
  item jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.player_id, w.username, w.avatar, w.item, w.created_at
    from public.upgrade_wins as w
   order by w.created_at desc
   limit 24;
$$;

revoke all on function public.get_upgrade_wins_feed() from public, anon, authenticated;
grant execute on function public.get_upgrade_wins_feed() to anon, authenticated;
