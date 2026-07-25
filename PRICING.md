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

- `agencies.plan` — which tier an agency is on (`starter` / `professional` /
  `enterprise`). Until Stripe exists, change it manually in Supabase:
  `update agencies set plan = 'professional' where id = '<agency uuid>';`
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
| Starter ($299) | 600 | 4 | 1 of 3 |
| Professional ($799) | 3,000 | 20 | all 15 |
| Enterprise ($1,999) | 12,000 | 80 | unlimited |

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
plans.ts, plans.js, and that SQL function. Change all three together.

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
| `customer.subscription.created/updated` | sets `agencies.plan` from the price's tier; `active`/`trialing`/`past_due` keep the tier, anything else drops to starter |
| `customer.subscription.deleted` | back to starter |

Every event id is recorded in `stripe_events` before handling, so Stripe's
retries are exactly-once — without it a redelivered checkout would grant the
credits twice. If a handler throws, the marker is deleted so the retry works.

### Staff fallbacks

Mission Control grants still work for comped credits or payments taken
outside Stripe. They're recorded in the same ledger with kind `grant` rather
than `purchase`.

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
