-- Credits: the unit that actually tracks generation spend.
--
-- The existing counters meter *actions* (a stage run, a revision, a press of
-- a Raws button). That works for LLM stages, where every run costs about the
-- same, but it badly under-charges media: "Generate Everything" is one
-- regeneration unit and renders ~40 assets. Credits meter the assets
-- themselves, weighted by what each type costs us to render.
--
-- Two pools, spent allowance-first so purchased credits are never burned
-- while the monthly grant still has room:
--   usage_credits  — consumed from this cycle's plan allowance, resets monthly
--   credit_balance — purchased top-ups, roll over indefinitely

alter table public.agencies
  add column if not exists usage_credits int not null default 0,
  add column if not exists credit_balance int not null default 0;

-- Append-only audit of every credit movement (spend is negative, grants
-- positive). Mirrors usage_logs, but with the project and asset kind so
-- spend can be attributed back to a campaign.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  -- negative = spent, positive = granted/purchased
  delta int not null,
  -- 'image' | 'voiceover' | 'broll' | 'talkinghead' | 'grant' | 'purchase' | 'refund'
  kind text not null,
  reason text,
  -- allowance remaining + purchased balance immediately after this row
  allowance_after int,
  balance_after int,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_agency_created_idx
  on public.credit_ledger (agency_id, created_at desc);
create index if not exists credit_ledger_project_idx
  on public.credit_ledger (project_id);

alter table public.credit_ledger enable row level security;

-- Agencies read their own ledger; only the service role writes (all writes
-- go through the SECURITY DEFINER functions below).
drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select using (agency_id = public.current_agency_id());

/**
 * Spend credits atomically. Drains this cycle's plan allowance first, then
 * purchased balance. All-or-nothing: if the two pools together can't cover
 * p_amount, nothing is deducted and ok=false comes back so the caller can
 * stop before doing paid work.
 *
 * Rolls the cycle over on first use in a new month, exactly like
 * consume_usage() does, so the two stay in step.
 */
create or replace function public.consume_credits(
  p_agency_id uuid,
  p_monthly_limit int,
  p_amount int,
  p_kind text default 'image',
  p_project_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_agency public.agencies;
  v_allowance_left int;
  v_from_allowance int;
  v_from_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'amount must be positive');
  end if;

  select * into v_agency from public.agencies where id = p_agency_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'agency not found');
  end if;

  if v_agency.billing_cycle_start is null
     or v_agency.billing_cycle_start < date_trunc('month', current_date) then
    update public.agencies
    set usage_generations = 0,
        usage_revisions = 0,
        usage_regenerations = 0,
        usage_credits = 0,
        billing_cycle_start = date_trunc('month', current_date)::date
    where id = p_agency_id;
    v_agency.usage_credits := 0;
  end if;

  v_allowance_left := greatest(p_monthly_limit - v_agency.usage_credits, 0);

  if v_allowance_left + v_agency.credit_balance < p_amount then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'needed', p_amount,
      'allowance_left', v_allowance_left,
      'balance', v_agency.credit_balance
    );
  end if;

  v_from_allowance := least(v_allowance_left, p_amount);
  v_from_balance := p_amount - v_from_allowance;

  update public.agencies
  set usage_credits = usage_credits + v_from_allowance,
      credit_balance = credit_balance - v_from_balance
  where id = p_agency_id;

  insert into public.credit_ledger
    (agency_id, project_id, delta, kind, reason, allowance_after, balance_after)
  values (
    p_agency_id, p_project_id, -p_amount, p_kind, 'render',
    v_allowance_left - v_from_allowance,
    v_agency.credit_balance - v_from_balance
  );

  return jsonb_build_object(
    'ok', true,
    'spent', p_amount,
    'from_allowance', v_from_allowance,
    'from_balance', v_from_balance,
    'allowance_left', v_allowance_left - v_from_allowance,
    'balance', v_agency.credit_balance - v_from_balance
  );
end;
$$;

/**
 * Add purchased/comped credits to the rolling balance. Used by staff grants
 * today and by the Stripe webhook once billing is live.
 */
create or replace function public.grant_credits(
  p_agency_id uuid,
  p_amount int,
  p_reason text default 'grant',
  p_kind text default 'grant'
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_balance int;
begin
  if p_amount is null or p_amount = 0 then
    return jsonb_build_object('ok', false, 'error', 'amount must be non-zero');
  end if;

  update public.agencies
  set credit_balance = greatest(credit_balance + p_amount, 0)
  where id = p_agency_id
  returning credit_balance into v_balance;

  if v_balance is null then
    return jsonb_build_object('ok', false, 'error', 'agency not found');
  end if;

  insert into public.credit_ledger
    (agency_id, delta, kind, reason, balance_after)
  values (p_agency_id, p_amount, p_kind, p_reason, v_balance);

  return jsonb_build_object('ok', true, 'balance', v_balance);
end;
$$;

/** Refund credits for a render that failed after being charged. */
create or replace function public.refund_credits(
  p_agency_id uuid,
  p_amount int,
  p_project_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_agency public.agencies;
  v_to_allowance int;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'amount must be positive');
  end if;

  select * into v_agency from public.agencies where id = p_agency_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'agency not found');
  end if;

  -- put it back where it came from: allowance first (it's the pool that
  -- expires), remainder onto the rolling balance
  v_to_allowance := least(v_agency.usage_credits, p_amount);

  update public.agencies
  set usage_credits = usage_credits - v_to_allowance,
      credit_balance = credit_balance + (p_amount - v_to_allowance)
  where id = p_agency_id;

  insert into public.credit_ledger
    (agency_id, project_id, delta, kind, reason, balance_after)
  values (
    p_agency_id, p_project_id, p_amount, 'refund', 'render failed',
    v_agency.credit_balance + (p_amount - v_to_allowance)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.consume_credits(uuid, int, int, text, uuid) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, int, text, text) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, int, uuid) from public, anon, authenticated;
