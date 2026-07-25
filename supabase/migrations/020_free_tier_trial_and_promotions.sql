-- Free tier, a real trial, and the promotions table.
--
-- WHY THE FREE TIER EXISTS
-- Until now `agencies.plan` defaulted to 'starter' and nothing ever expired,
-- so every signup received the full $299 plan free, permanently. The
-- advertised "free trial" was copy on a page — `trial_ends_at` was set
-- nowhere and read nowhere.
--
-- The trial is now Stripe's job (7 days, card required, started at Checkout).
-- That leaves one gap: somewhere safe to land when a trial ends unpaid or a
-- subscription is cancelled. Previously that was 'starter' — i.e. we kept
-- giving the product away. 'free' is that landing spot: read-only, no
-- generation, nothing deleted.

-- ---------------------------------------------------------------------------
-- 1. Allow the new tier
-- ---------------------------------------------------------------------------

alter table public.agencies drop constraint if exists agencies_plan_check;
alter table public.agencies add constraint agencies_plan_check
  check (plan in ('free', 'starter', 'professional', 'enterprise'));

-- (001 also defined profiles.plan with the same constraint, but a later
-- migration dropped that column — agencies.plan is the only copy now.)

-- New agencies start with no plan and subscribe into one. NOTE: a column
-- default only affects future inserts — every existing agency keeps the tier
-- it has today. Move real free-riders by hand in Mission Control.
alter table public.agencies alter column plan set default 'free';

-- ---------------------------------------------------------------------------
-- 2. One trial per agency
-- ---------------------------------------------------------------------------
-- Stripe does not dedupe trials. Without this flag, cancel-and-resubscribe
-- grants another free week, forever. Set once, when the first trialing
-- subscription arrives; checkout only offers a trial while it is false.

alter table public.agencies
  add column if not exists has_trialed boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. Deliverables limit for the new tier
-- ---------------------------------------------------------------------------
-- Third of the three places this number lives (the others are
-- src/data/plans.ts and the server's src/lib/plans.js) — see PRICING.md.

create or replace function public.deliverable_project_limit(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'free' then 0
    when 'starter' then 1
    when 'professional' then 15
    when 'enterprise' then 999999
    else 1
  end;
$$;

-- Reworded so the zero case reads like a sentence. Previously a limit of 0
-- would have produced "finishes 0 projects and those slots are already used".
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

  if v_limit <= 0 then
    raise exception using
      errcode = 'check_violation',
      message = 'Your plan does not include final deliverables. Subscribe to take a campaign through to finished creatives.';
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

-- ---------------------------------------------------------------------------
-- 4. Promotions
-- ---------------------------------------------------------------------------
-- Stripe owns discount MATHS (coupons + promotion codes). This table owns
-- what gets SHOWN, to whom, and when. `discount_label` is display copy only —
-- the real reduction is whatever the Stripe promotion code says, so the two
-- can never be made to disagree by editing a row here.

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  headline text not null,
  body text,
  cta_label text,
  -- where the button goes: the plan picker, the credit packs, or a URL
  cta_target text not null default 'upgrade'
    check (cta_target in ('upgrade', 'credits', 'url')),
  cta_url text,
  -- who sees it; resolved server-side from the caller's agency state
  audience text not null default 'all'
    check (audience in ('all', 'trialing', 'free', 'starter', 'professional', 'low_credits', 'out_of_credits')),
  placement text not null default 'dashboard'
    check (placement in ('dashboard', 'pricing', 'both')),
  -- the code a user types at Checkout, if this offer carries a discount
  stripe_promotion_code text,
  discount_label text,
  -- null starts_at = live immediately; null ends_at = permanent
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  dismissible boolean not null default true,
  -- highest wins when several match
  priority int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotions_live_idx
  on public.promotions (active, placement, priority desc);

-- Service-role only, like billing_prices. The browser never reads this
-- directly — the orchestrator resolves audience and serves the matches, so
-- an offer aimed at one agency can't be enumerated by another.
alter table public.promotions enable row level security;

revoke all on public.promotions from public, anon, authenticated;
