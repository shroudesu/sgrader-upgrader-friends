-- Run after upgrade-bonus.sql, community-features.sql, and cases.sql.
-- Persist each successful golden-stage item in the shared wins feed.

do $$
begin
  if pg_catalog.to_regprocedure('public.record_skin_upgrade_award(uuid,jsonb)') is null then
    raise exception 'Apply upgrade-bonus.sql before upgrade-gold-feed.sql';
  end if;
end;
$$;

create or replace function public.publish_skin_upgrade_stage_to_feed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'bonus_pending'
     and new.status = 'bonus_ready'
     and new.stage > old.stage
     and new.current_item is distinct from old.current_item
     and coalesce(new.current_item ->> 'catalogType', 'skin') = 'skin' then
    perform public.record_skin_upgrade_award(new.user_id, new.current_item);
  elsif new.status = 'complete'
     and new.award_kind = 'win'
     and new.awarded_item is not null
     and coalesce(new.awarded_item ->> 'catalogType', 'skin') = 'skin' then
    perform public.record_skin_upgrade_award(new.user_id, new.awarded_item);
  end if;

  return new;
end;
$$;

revoke all on function public.publish_skin_upgrade_stage_to_feed() from public, anon, authenticated;
drop trigger if exists skin_upgrade_stage_feed on public.skin_upgrade_runs;
create trigger skin_upgrade_stage_feed
after update of status, stage, current_item, awarded_item
on public.skin_upgrade_runs
for each row execute function public.publish_skin_upgrade_stage_to_feed();

notify pgrst, 'reload schema';
