-- 014: un-shelve the `editing` stage as "Deliverables" (final client-ready
-- outputs). Add it to the per-project stage seeder and backfill existing rows.
create or replace function public.create_project_stages()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.project_stages (project_id, stage, status, started_at, completed_at)
  values
    (new.id, 'discovery', 'completed', now(), now()),
    (new.id, 'research',  'pending', null, null),
    (new.id, 'ideation',  'pending', null, null),
    (new.id, 'scripts',   'pending', null, null),
    (new.id, 'shootplan', 'pending', null, null),
    (new.id, 'shooting',  'pending', null, null),
    (new.id, 'editing',   'pending', null, null);
  return new;
end;
$function$;

insert into public.project_stages (project_id, stage, status)
select p.id, 'editing', 'pending'
from public.projects p
where not exists (
  select 1 from public.project_stages s
  where s.project_id = p.id and s.stage = 'editing'
);
