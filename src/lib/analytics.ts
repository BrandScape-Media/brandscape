/**
 * Product analytics — PostHog, loaded only when a key is configured.
 *
 * The launch question this exists to answer is a funnel, not a pageview count:
 * visit -> signup -> trial -> paid. Without it a launch produces a number of
 * visitors and no idea which step loses them.
 *
 * Inert by default. `VITE_POSTHOG_KEY` is unset locally and in demo mode, so
 * nothing loads, nothing is sent, and no consent banner is owed. Set it in the
 * GitHub Actions secrets to switch it on in production.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
// EU host by default — the audience is agencies and the data is behavioural.
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.i.posthog.com'

// Guard against EMPTY STRING, not just undefined: CI injects the variable
// whether or not the secret exists, so `?? fallback` would keep `""`.
// (Same trap as the Supabase vars — it has bitten this codebase twice.)
const enabled = Boolean(KEY && KEY.trim())

interface PostHogLike {
  init: (key: string, opts: Record<string, unknown>) => void
  capture: (event: string, props?: Record<string, unknown>) => void
  identify: (id: string, props?: Record<string, unknown>) => void
  reset: () => void
}

declare global {
  interface Window {
    posthog?: PostHogLike
  }
}

let loaded = false

/** Called once from main.tsx. Safe to call when unconfigured — it no-ops. */
export function initAnalytics(): void {
  if (!enabled || loaded || typeof window === 'undefined') return
  loaded = true

  const script = document.createElement('script')
  script.src = `${HOST}/static/array.js`
  script.async = true
  script.onload = () => {
    window.posthog?.init(KEY as string, {
      api_host: HOST,
      // We drive pageviews ourselves — React Router changes the URL without a
      // load, so autocapture would only ever see the first one.
      capture_pageview: false,
      persistence: 'localStorage',
    })
  }
  document.head.appendChild(script)
}

export function trackPageView(path: string): void {
  window.posthog?.capture('$pageview', { $current_url: window.location.origin + path })
}

/** The funnel steps worth naming, so they can't drift into typos at call sites. */
export type AnalyticsEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'agency_created'
  | 'checkout_started'
  | 'stage_run'
  | 'invite_created'

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  window.posthog?.capture(event, props)
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  window.posthog?.identify(userId, props)
}

export function resetAnalytics(): void {
  window.posthog?.reset()
}
