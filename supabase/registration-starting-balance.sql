-- Run once in Supabase SQL Editor.
-- New player accounts will start with a 500 ₽ demo balance. Existing balances stay unchanged.

create or replace function public.handle_new_game_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  v_username := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if length(v_username) < 3 or length(v_username) > 16
     or v_username !~ '^[A-Za-z0-9_А-Яа-яЁё]+$' then
    raise exception 'Invalid game username';
  end if;

  insert into public.profiles (user_id, username)
  values (new.id, v_username);
  insert into public.wallets (user_id, balance) values (new.id, 500.00);
  insert into public.game_states (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_game_user() from public, anon, authenticated;
