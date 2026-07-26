-- Solo: a $99 door below Starter.
--
-- Every competitor in the category has an entry point under $120 — Pencil at
-- $14, Creatify at $19, HeyGen at $29, AdCreative at $39, Arcads at $110.
-- Brandscape's cheapest was $299, which is where Creatify's *agency* plan
-- sits. There was no way for an agency to see the pipeline produce anything
-- without committing to the most expensive entry tier in the market.
--
-- Solo is one project, one finished campaign, 150 credits — exactly one full
-- shoot. Its effective rate ($0.66/credit) is deliberately WORSE than
-- Starter's ($0.498) so the ladder points upward.
--
-- Third of the three places this number lives, per PRICING.md: the other two
-- are src/data/plans.ts and the server's src/lib/plans.js. Change all three
-- together or the UI, the enforcement and the trigger disagree.

alter table public.agencies drop constraint if exists agencies_plan_check;
alter table public.agencies add constraint agencies_plan_check
  check (plan in ('free', 'solo', 'starter', 'professional', 'enterprise'));

-- Note: 001 declares a `plan` column on profiles with its own CHECK, but it
-- does not exist in production — the early migrations were applied by other
-- means and the file has drifted. Nothing here touches it; agencies.plan is
-- the only tier column the app reads or writes.

-- Offers can be aimed at a tier, and the audience list is a CHECK rather than
-- a lookup table, so a new tier has to be added here or Mission Control can
-- never target it.
alter table public.promotions drop constraint if exists promotions_audience_check;
alter table public.promotions add constraint promotions_audience_check
  check (audience in (
    'all', 'trialing', 'free', 'solo', 'starter', 'professional',
    'low_credits', 'out_of_credits'
  ));

-- Solo finishes one campaign, same as Starter. The step up to Starter is
-- volume (1 -> 3 projects, 150 -> 600 credits), not the deliverables gate.
-- `set search_path` is not decoration: `create or replace` resets a function's
-- SET clauses, so leaving it off here silently undoes the 004 advisor
-- hardening pass and the linter starts warning again.
create or replace function public.deliverable_project_limit(p_plan text)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_plan
    when 'free' then 0
    when 'solo' then 1
    when 'starter' then 1
    when 'professional' then 15
    when 'enterprise' then 999999
    else 1
  end;
$$;
