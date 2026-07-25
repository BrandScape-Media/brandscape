-- Stripe billing: price catalogue, webhook idempotency, subscription state.
--
-- Price IDs are created in Stripe (by the provisioning route) and recorded
-- here so the server can turn "starter, yearly" into a price id without
-- hardcoding anything. Rows are scoped by livemode so a test-mode catalogue
-- and a live one can coexist without one paying for the other.

create table if not exists public.billing_prices (
  -- the Stripe price id (price_…)
  id text primary key,
  stripe_product_id text not null,
  -- 'subscription' | 'credits'
  kind text not null,
  -- subscriptions: which tier this price grants
  tier text,
  -- subscriptions: 'month' | 'year'
  billing_interval text,
  -- credit packs: which pack, and how many credits it grants
  pack_id text,
  credits int,
  amount_cents int not null,
  currency text not null default 'usd',
  livemode boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists billing_prices_lookup_idx
  on public.billing_prices (livemode, kind, active);

-- Service-role only: the orchestrator resolves prices, the browser never
-- reads this table directly (it asks for a checkout URL instead).
alter table public.billing_prices enable row level security;

-- Webhooks retry, and Stripe explicitly warns events can arrive more than
-- once. Recording ids makes every handler exactly-once — without this a
-- redelivered checkout.session.completed grants the credits twice.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

alter table public.agencies
  add column if not exists subscription_status text,
  add column if not exists subscription_period_end timestamptz;
