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
