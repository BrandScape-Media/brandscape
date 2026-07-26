-- Tell people their card failed.
--
-- The lifecycle already ENDED safely: `past_due` keeps the tier while Stripe
-- retries, and `unpaid`/`canceled` fall outside the entitled list and drop the
-- agency to `free`. What was missing was the middle — a customer whose card
-- expired got no signal from us at all, and the first thing they'd notice is
-- losing access weeks later.
--
-- `subscription_status` alone can't drive a useful banner: knowing you're
-- past_due doesn't tell you where to pay. Stripe's hosted invoice URL does,
-- and it needs no card handling on our side.

alter table public.agencies
  add column if not exists payment_failed_at timestamptz,
  -- Stripe-hosted, expires on its own, safe to hand to the browser
  add column if not exists payment_invoice_url text;

comment on column public.agencies.payment_failed_at is
  'Set by the invoice.payment_failed webhook, cleared by invoice.paid. Drives the billing banner.';
