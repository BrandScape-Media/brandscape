-- ============================================
-- Migration 007 — Atomic usage metering with monthly rollover
-- Called by the orchestrator (service role) before queuing AI work.
-- Returns true and increments the counter if the agency is under
-- `p_limit`; returns false (no increment) when the quota is exhausted.
-- Counters reset when a new billing month starts.
-- ============================================

create or replace function public.consume_usage(
  p_agency_id uuid,
  p_kind text,          -- 'generation' | 'revision'
  p_limit int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency public.agencies;
begin
  select * into v_agency from public.agencies where id = p_agency_id for update;
  if not found then
    return false;
  end if;

  -- monthly rollover
  if v_agency.billing_cycle_start is null
     or v_agency.billing_cycle_start < date_trunc('month', current_date) then
    update public.agencies
    set usage_generations = 0,
        usage_revisions = 0,
        billing_cycle_start = date_trunc('month', current_date)::date
    where id = p_agency_id;
    v_agency.usage_generations := 0;
    v_agency.usage_revisions := 0;
  end if;

  if p_kind = 'generation' then
    if v_agency.usage_generations >= p_limit then
      return false;
    end if;
    update public.agencies set usage_generations = usage_generations + 1 where id = p_agency_id;
  elsif p_kind = 'revision' then
    if v_agency.usage_revisions >= p_limit then
      return false;
    end if;
    update public.agencies set usage_revisions = usage_revisions + 1 where id = p_agency_id;
  else
    raise exception 'Unknown usage kind: %', p_kind;
  end if;

  insert into public.usage_logs (agency_id, type, amount)
  values (p_agency_id, p_kind, 1);

  return true;
end;
$$;

-- service role only — members never meter themselves
revoke execute on function public.consume_usage(uuid, text, int) from public, anon, authenticated;
