import type { PlanTier } from '../types'

/**
 * A plan chosen on the pricing page while logged out.
 *
 * We can't open Stripe Checkout at that point — there's no agency yet, and
 * Checkout needs a customer to attach the subscription to. So the choice is
 * parked here, survives both the signup form and the Google OAuth round-trip
 * (which leaves the site entirely), and is picked up by the Billing page once
 * the agency exists.
 *
 * sessionStorage, not localStorage: an abandoned intent should die with the
 * tab rather than ambush someone with a checkout page next week.
 */

const KEY = 'brandscape:checkout-intent'

export interface CheckoutIntent {
  tier: PlanTier
  interval: 'month' | 'year'
}

export function saveCheckoutIntent(intent: CheckoutIntent): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(intent))
  } catch {
    /* private browsing / storage disabled — the user just picks again */
  }
}

/** Read and clear in one go, so a resumed checkout can't fire twice. */
export function takeCheckoutIntent(): CheckoutIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    const parsed = JSON.parse(raw) as CheckoutIntent
    if (!parsed?.tier) return null
    return { tier: parsed.tier, interval: parsed.interval === 'year' ? 'year' : 'month' }
  } catch {
    return null
  }
}
