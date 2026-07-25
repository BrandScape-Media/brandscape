-- Starter finishes ONE campaign: the Deliverables stage is the upsell gate.
--
-- Projects advance stage straight from the browser under RLS (no orchestrator
-- route to hook), so this has to be enforced in the database or not at all.
-- That means the per-plan number lives here as well as in the two plans files
-- — the same deliberate duplication PRICING.md already documents for
-- src/data/plans.ts and server src/lib/plans.js. Change all three together.

create or replace function public.deliverable_project_limit(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'starter' then 1
    when 'professional' then 15
    when 'enterprise' then 999999
    else 1
  end;
$$;

create or replace function public.enforce_deliverable_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_plan text;
  v_limit int;
  v_used int;
begin
  -- only the moment a project ENTERS Deliverables matters
  if new.current_stage is distinct from 'editing'
     or old.current_stage is not distinct from 'editing' then
    return new;
  end if;

  select plan into v_plan from public.agencies where id = new.agency_id;
  v_limit := public.deliverable_project_limit(coalesce(v_plan, 'starter'));

  if v_limit >= 999999 then
    return new;
  end if;

  select count(*) into v_used
  from public.projects
  where agency_id = new.agency_id
    and id <> new.id
    and coalesce(archived, false) = false
    and current_stage = 'editing';

  if v_used >= v_limit then
    raise exception using
      errcode = 'check_violation',
      message = format(
        'Your plan finishes %s project%s in Deliverables and %s already used. Upgrade to take more campaigns through to final creatives.',
        v_limit,
        case when v_limit = 1 then '' else 's' end,
        case when v_limit = 1 then 'that slot is' else 'those slots are' end
      );
  end if;

  return new;
end;
$$;

drop trigger if exists projects_deliverable_limit on public.projects;
create trigger projects_deliverable_limit
  before update on public.projects
  for each row
  execute function public.enforce_deliverable_limit();
