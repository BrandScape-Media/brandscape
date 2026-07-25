# Pricing & Plan Limits — How It Works and How to Change It

## Where each limit lives (and what it controls)

Limits are defined in **two files** — one for what users *see and hit in the
UI*, one for what the server *actually enforces*. Keep them in sync.

### 1. Frontend — `src/data/plans.ts` (this repo, public)

Controls the pricing page, the Settings/Overview usage displays, and the
client-side gates. Per tier:

| Field | What it gates |
|---|---|
| `priceMonthly` / `priceYearly` | Display only (Stripe comes later) |
| `projectsIncluded` | Blocks "New Project" when active (non-archived) projects reach this |
| `generationsPerMonth` | Display of usage bars (enforced server-side) |
| `revisionsIncluded` | Display of usage bars (enforced server-side) |
| `storageGb` | Upload quota bar in Media Library → Uploads; blocks over-quota uploads |
| `features[]` | Bullet list on the pricing page |

After editing: commit + push → GitHub Actions redeploys brandscape.media.

### 2. Backend — `src/lib/plans.js` (brandscape-server repo, private)

The **source of truth** the orchestrator enforces before doing paid work:

- `generationsPerMonth` — every AI stage run consumes 1 (image/video/TTS
  jobs will consume these too)
- `revisionsPerMonth` — every AI chat revision consumes 1
- Over-limit requests get rejected with a clear "limit reached" error.

After editing: commit + push → Railway redeploys automatically.

### 3. Database — what's stored where

- `agencies.plan` — which tier an agency is on (`free` / `starter` /
  `professional` / `enterprise`), set by the Stripe webhook. Staff can
  override it in Mission Control → Plans & Credits.
- `agencies.usage_generations` / `usage_revisions` — this month's counters,
  incremented atomically by the `consume_usage()` function (migration 007),
  which also **resets them automatically when a new calendar month starts**
  (`billing_cycle_start` tracks the current cycle).
- `usage_logs` — an append-only audit trail of every consumed unit.

### Data storage per tier (current architecture)

- Auth, database rows (clients, projects, stage outputs, comments):
  **Supabase Postgres** — not metered per tier.
- Uploaded brand assets: **Cloudflare R2** (bucket `brandscape-media`,
  presigned URLs via the orchestrator — setup in the private repo's
  R2-SETUP.md), metered against `storageGb` and enforced server-side at
  presign time. Falls back to Supabase Storage only while the R2 env vars
  are missing; pre-switch uploads stay on Supabase (tracked per-file by
  `client_assets.storage_provider`).
- Generated media (images/video/TTS): same R2 bucket under `generated/…`,
  counts against the same `storageGb` quota.

## Credits — the meter that prices generation

Action counters can't price media. "Generate Everything" is **one** press of
one button and ~40 renders, so metering button presses caps annoyance, not
spend. Credits are charged **per rendered asset**, weighted by cost:

| Asset | Credits | ~our cost |
|---|---|---|
| Image (product / composite) | 1 | $0.04 |
| Voiceover line | 2 | $0.08 |
| B-roll clip | 6 | $0.24 |
| Talking-head clip | 10 | $0.40 |

One credit ≈ **$0.04** of render cost. A full six-script project shoot
(≈16 images + 12 VOs + 13 clips) ≈ **150 credits ≈ $6**.

### Included per month

| Tier | Credits | ≈ full shoots | Deliverable projects |
|---|---|---|---|
| Free ($0) | 0 | 0 | 0 of 1 |
| Starter ($299) | 600 | 4 | 1 of 3 |
| Professional ($799) | 3,000 | 20 | all 15 |
| Enterprise ($1,999) | 12,000 | 80 | unlimited |

### The `free` tier

`free` is a **state you land in, not a product you buy** — before the trial
starts, and after a subscription lapses or is cancelled. It has no Stripe
price, which is why provisioning iterates `SELLABLE_TIERS` rather than
`PLAN_LIMITS` (iterating the latter would try to create a product with no
amount).

It is **read-only, never destructive**: existing projects, media and
deliverables stay visible and downloadable; only new paid work is blocked.
Zero limits do the blocking on their own — `consume_usage` refuses when
`used >= limit`, and `0 >= 0` is always true.

Before migration 020 the column defaulted to `starter` and nothing expired,
so every signup received the full $299 plan free, forever. **Changing the
default only affects new rows** — agencies created before then keep the tier
they have. Move real free-riders by hand in Mission Control.

### Top-up packs (overage)

| Pack | Price | Per credit |
|---|---|---|
| 250 | $49 | $0.196 |
| 600 | $99 | $0.165 |
| 1,500 | $199 | $0.133 |

Sold at roughly 4–5x render cost — normal for managed AI infrastructure once
support, storage, orchestration and failed renders are absorbed. Bigger packs
are cheaper per credit to pull agencies upward. Purchased credits roll over;
the monthly allowance does not.

**Spend order:** monthly allowance first, then purchased balance, so bought
credits are never burned while the plan still has room.

### Where credits live

- `src/lib/plans.js` (server) — `creditsPerMonth`, `CREDIT_WEIGHTS`,
  `CREDIT_PACKS`. Source of truth.
- `src/data/plans.ts` (this repo) — display copy + demo fallback.
- `agencies.usage_credits` (allowance spent this cycle) and
  `agencies.credit_balance` (purchased, rolls over).
- `credit_ledger` — every movement, with the project it was spent on.
- `consume_credits()` / `grant_credits()` / `refund_credits()` — atomic,
  service-role only. A render charges up front and refunds on failure.

### Deliverables gate

`deliverableProjects` is enforced by a **database trigger**
(`enforce_deliverable_limit`), because projects advance stage straight from
the browser under RLS — there's no orchestrator route to hook. That means the
number also lives in `deliverable_project_limit()` in SQL. Three places:
plans.ts, plans.js, and that SQL function. Change all three together — and
that includes adding any **new tier** to all three.

On the frontend, resolve a tier with `planFor(tier)` from `src/data/plans.ts`.
The old idiom `plans.find(p => p.tier === agency.plan) ?? plans[0]` silently
hands a `free` agency Starter's client-side allowances, which the server then
refuses — confusing for the user and invisible in testing.

### Staff controls

Mission Control → **Plans & Credits**: change any agency's tier, reset its
counters, grant or claw back credits, and read the credit ledger. No SQL
needed.

## Stripe billing

Money moves only through Stripe-hosted pages — Checkout to buy, the Customer
Portal to change or cancel. Card details never reach our servers or the
browser bundle.

**Test vs live is decided purely by which key is set.** `sk_test_…` uses
Stripe's sandbox; `sk_live_…` moves real money. `/health` reports
`stripe_live_mode` so the two can never be confused.

### One-time setup

1. Railway env vars on the orchestrator:
   - `STRIPE_SECRET_KEY` — start with the **test** key
   - `STRIPE_WEBHOOK_SECRET` — from step 3
2. Mission Control → Plans & Credits → **Provision in Stripe**. Creates the
   three tiers (monthly + yearly) and the three credit packs from
   `src/lib/plans.js`, and records their price IDs in `billing_prices`.
   Idempotent — re-running reuses anything that already exists.
3. Stripe Dashboard → Developers → Webhooks → add endpoint
   `https://api.brandscape.media/v1/billing/webhook`, subscribe to
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Test with card `4242 4242 4242 4242`, then swap both values for the live
   key + live webhook secret and run **Provision in Stripe** again (the live
   catalogue is separate; rows are scoped by `livemode`).

### What grants what

**Only the webhook grants anything.** A user landing on the success URL
proves nothing — they can just open it — so the success page is cosmetic and
every entitlement waits for a signed event.

| Event | Effect |
|---|---|
| `checkout.session.completed` (mode=payment) | `grant_credits()` for the pack's credits |
| `customer.subscription.created/updated` | sets `agencies.plan` from the price's tier; `active`/`trialing`/`past_due` keep the tier, anything else drops to `free` |
| `customer.subscription.deleted` | back to `free` |

Every event id is recorded in `stripe_events` before handling, so Stripe's
retries are exactly-once — without it a redelivered checkout would grant the
credits twice. If a handler throws, the marker is deleted so the retry works.

### When a payment succeeds but nothing is granted

Everything below cost us an afternoon on 2026-07-25. The symptom is always
the same — Stripe says `paid`, the account shows nothing — so work down the
list in order.

1. **Webhook endpoints, events and signing secrets are per-mode.** An
   endpoint created with the dashboard's *Test mode* toggle OFF is invisible
   to test-mode checkouts, and its events never appear in the test events
   log. Both a live and a test `whsec_…` are 38 characters, so you cannot
   tell them apart by looking — always Reveal the secret from the specific
   endpoint showing the failed deliveries.
2. **Check `/health`.** `stripe_webhook_configured` says only that the env
   var is set; `stripe_live_mode` says which key is loaded. They can
   disagree with each other, and that is the bug.
3. **Read the 400 body in Stripe's delivery log.** The webhook returns a
   `reason` (`Webhook signature mismatch` = wrong secret, `timestamp outside
   tolerance` = clock skew, `is not set` = unset var) plus the loaded
   secret's length and prefix. No secret material, enough to diagnose.
4. **Nothing is redelivered retroactively.** Stripe only delivers to
   endpoints that existed when the event fired, so purchases made before the
   endpoint was created need a manual Resend from the Events page.
5. **If the DB has the credits but the page doesn't**, it's the frontend.
   `/dashboard/billing` polls for a few seconds after `?checkout=success`;
   a hard reload settles whether the grant landed.

### Staff fallbacks

Mission Control grants still work for comped credits or payments taken
outside Stripe. They're recorded in the same ledger with kind `grant` rather
than `purchase`.

### The trial

**7 days, card required, Starter only, run entirely by Stripe.** Checkout
passes `trial_period_days: 7` (from `TRIAL_DAYS`) plus
`trial_settings.end_behavior.missing_payment_method: 'cancel'`. The webhook
already treats `trialing` as entitled, so the tier is granted immediately and
the first charge lands on day seven. `/health` reports `trial_tiers` and
`trial_days`, so the policy is checkable against production.

**Starter only, because a trial hands over a full month's allowance before
any charge.** Cancelling on day six costs us 600 credits (~$24 of render) on
Starter, 3,000 (~$120) on Professional, 12,000 (~$480) on Enterprise.
`TRIAL_TIERS` in the server's plans.js is the switch; add a tier there and
you are agreeing to give that allowance away.

**One trial per agency.** Stripe does not dedupe this — without a guard,
cancel-and-resubscribe grants another free week indefinitely. `agencies.
has_trialed` is set the moment a `trialing` subscription arrives, and
checkout only offers a trial while it is false.

**Three gates, because there are three ways in:**

1. Checkout will not attach a trial to a tier outside `TRIAL_TIERS`.
2. Checkout refuses outright when a live subscription already exists — it can
   only ever *mint* a subscription, never switch one, so a second call bills
   the agency twice. Existing subscribers change plan through the Customer
   Portal, where Stripe prorates properly. The route returns
   `code: 'already_subscribed'` and the frontend redirects to Billing.
3. The webhook ends any trial it finds on an ineligible tier
   (`trial_end: 'now'`). **A price change inside the Portal keeps the original
   trial end date**, so without this a Starter trial could be upgraded to
   Enterprise and stay free until day seven. Running the check on every
   subscription event covers the Portal, the API and the Stripe dashboard
   alike.

When a trial or subscription ends unpaid, the agency drops to **`free`**, not
`starter`. That distinction is the whole point: dropping to `starter` was the
free-forever hole.

## Offers

Stripe owns the discount **maths** (coupons + promotion codes). The
`promotions` table owns **what is shown, to whom, and when** — so the label
and the money can't be edited into disagreeing. Checkout sets
`allow_promotion_codes: true` so a displayed code is actually redeemable.

| Column | Purpose |
|---|---|
| `audience` | `all`, `trialing`, `free`, `starter`, `professional`, `low_credits`, `out_of_credits` |
| `placement` | `dashboard`, `pricing`, `both` |
| `stripe_promotion_code` | the code customers type at checkout |
| `discount_label` | display copy only |
| `starts_at` / `ends_at` | null = live now / permanent |

Audience is resolved **server-side** (`GET /v1/billing/offers`) from the
caller's plan, subscription status and credit position — the table is
service-role only, so an offer aimed at lapsed accounts can't be enumerated
by everyone else. The pricing page uses a separate unauthenticated route
(`/v1/billing/offers/public`) that can only ever return `audience: 'all'`.

Manage them in Mission Control → **Offers**. Dismissals live in
`localStorage`, keyed by promotion id.

The **permanent** offer is annual billing (19% off), built into the pricing
page rather than stored as a row. Trial reminders are *system* state computed
from `subscription_period_end`, deliberately separate from marketing offers.

## Where the tiers sit in the market (checked 2026-07-25)

| Product | Entry | Top public tier |
|---|---|---|
| Pencil | $14/mo | $55/mo, then custom |
| Creatify | $39/mo | ~$49/mo |
| AdCreative.ai | $39/mo | $599/mo |
| HeyGen | ~$29/mo | ~$220/mo |
| Arcads | ~$110/mo | $500+/mo (~$11/video) |
| **Brandscape** | **$299/mo** | **$1,999/mo** |

Brandscape is the most expensive entry point in the category. That is
defensible **only because the page sells the pipeline** — those products are
point tools that render a clip from a script you supply, whereas this runs
the seven stages around it. The pricing page therefore leads with the stages,
not a feature list.

Watch the entry price after launch. If trial starts are weak, the fix is a
cheaper rung *below* Starter, not discounting Starter — discounting the
anchor tier teaches the market the price isn't real.

## Recipe: changing a tier after market research

Example — make Professional $899 with 20 projects and 400 generations:

1. `src/data/plans.ts` → in the `professional` block set
   `priceMonthly: 899`, `projectsIncluded: 20`, `generationsPerMonth: 400`,
   and update the matching `features[]` labels.
2. `brandscape-server/src/lib/plans.js` → set `projects: 20`,
   `generationsPerMonth: 400` in `professional`.
3. Push both repos. Done — existing usage counters are unaffected; new
   limits apply immediately.

## Recipe: adding a whole new tier (e.g. "Scale")

1. DB: the `plan` column allows `starter/professional/enterprise` via a CHECK
   constraint — add the new value in a migration:
   ```sql
   alter table public.agencies drop constraint agencies_plan_check;
   alter table public.agencies add constraint agencies_plan_check
     check (plan in ('starter','professional','scale','enterprise'));
   ```
2. Add the tier object to both plans files (same shape as the others) and
   add the tier name to `PlanTier` in `src/types/index.ts`.
