-- Public-to-authenticated-player leaderboards for demo balances and inventory.
-- Apply after schema.sql; the function returns the top 100 for each category.

create or replace function public.get_player_leaderboards()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  with player_values as materialized (
    select p.player_id,
           p.username,
           nullif(gs.state ->> 'avatar', '') as avatar,
           coalesce(w.balance, 0)::numeric as cash_balance,
           coalesce(sum(case
             when coalesce(item.value ->> 'price', '') ~ '^[0-9]+(\.[0-9]{1,2})?$'
               then (item.value ->> 'price')::numeric
             else 0
           end), 0)::numeric as skin_balance
      from public.profiles p
      left join public.wallets w on w.user_id = p.user_id
      left join public.game_states gs on gs.user_id = p.user_id
      left join lateral jsonb_array_elements(
        case when jsonb_typeof(gs.state -> 'inventory') = 'array'
          then gs.state -> 'inventory' else '[]'::jsonb end
      ) as item(value) on true
     group by p.player_id, p.username, gs.state, w.balance
  )
  select jsonb_build_object(
    'total', coalesce((
      select jsonb_agg(jsonb_build_object(
        'place', ranked.place,
        'player_id', ranked.player_id,
        'username', ranked.username,
        'avatar', ranked.avatar,
        'amount', ranked.cash_balance + ranked.skin_balance
      ) order by ranked.place)
        from (
          select pv.player_id, pv.username, pv.avatar,
                 pv.cash_balance, pv.skin_balance,
                 row_number() over (
                   order by pv.cash_balance + pv.skin_balance desc,
                            pv.cash_balance desc,
                            pv.player_id asc
                 ) as place
            from player_values as pv
           order by pv.cash_balance + pv.skin_balance desc,
                    pv.cash_balance desc,
                    pv.player_id asc
           limit 100
        ) as ranked
    ), '[]'::jsonb),
    'money', coalesce((
      select jsonb_agg(jsonb_build_object(
        'place', ranked.place,
        'player_id', ranked.player_id,
        'username', ranked.username,
        'avatar', ranked.avatar,
        'amount', ranked.cash_balance
      ) order by ranked.place)
        from (
          select pv.player_id, pv.username, pv.avatar, pv.cash_balance,
                 row_number() over (
                   order by pv.cash_balance desc,
                            pv.skin_balance desc,
                            pv.player_id asc
                 ) as place
            from player_values as pv
           order by pv.cash_balance desc,
                    pv.skin_balance desc,
                    pv.player_id asc
           limit 100
        ) as ranked
    ), '[]'::jsonb),
    'skins', coalesce((
      select jsonb_agg(jsonb_build_object(
        'place', ranked.place,
        'player_id', ranked.player_id,
        'username', ranked.username,
        'avatar', ranked.avatar,
        'amount', ranked.skin_balance
      ) order by ranked.place)
        from (
          select pv.player_id, pv.username, pv.avatar, pv.skin_balance,
                 row_number() over (
                   order by pv.skin_balance desc,
                            pv.cash_balance desc,
                            pv.player_id asc
                 ) as place
            from player_values as pv
           order by pv.skin_balance desc,
                    pv.cash_balance desc,
                    pv.player_id asc
           limit 100
        ) as ranked
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_player_leaderboards() from public, anon;
grant execute on function public.get_player_leaderboards() to authenticated;

notify pgrst, 'reload schema';
