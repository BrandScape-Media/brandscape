-- ============================================
-- Migration 016 — Meter media regenerations (Raws)
-- --------------------------------------------
-- Each Raws generation action (regenerate an image/video card, re-synth a
-- voiceover, or a "Generate all / Everything" run) costs one regeneration
-- credit so agencies can't spam the GPU / ElevenLabs. Same atomic,
-- monthly-rollover mechanism as generations/revisions — a new usage kind
-- 'regeneration' with its own per-plan limit (see server src/lib/plans.js
-- + src/data/plans.ts). System-triggered work (the auto first-pass VO after
-- the Shoot Plan) is NOT metered — only agency-initiated actions are.
-- ============================================

alter table public.agencies
  add column if not exists usage_regenerations int not null default 0;

create or replace function public.consume_usage(
  p_agency_id uuid,
  p_kind text,          -- 'generation' | 'revision' | 'regeneration'
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

  -- monthly rollover: reset every counter when a new billing month starts
  if v_agency.billing_cycle_start is null
     or v_agency.billing_cycle_start < date_trunc('month', current_date) then
    update public.agencies
    set usage_generations = 0,
        usage_revisions = 0,
        usage_regenerations = 0,
        billing_cycle_start = date_trunc('month', current_date)::date
    where id = p_agency_id;
    v_agency.usage_generations := 0;
    v_agency.usage_revisions := 0;
    v_agency.usage_regenerations := 0;
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
  elsif p_kind = 'regeneration' then
    if v_agency.usage_regenerations >= p_limit then
      return false;
    end if;
    update public.agencies set usage_regenerations = usage_regenerations + 1 where id = p_agency_id;
  else
    raise exception 'Unknown usage kind: %', p_kind;
  end if;

  insert into public.usage_logs (agency_id, type, amount)
  values (p_agency_id, p_kind, 1);

  return true;
end;
$$;

revoke execute on function public.consume_usage(uuid, text, int) from public, anon, authenticated;
