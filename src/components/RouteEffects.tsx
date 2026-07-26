import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/analytics'
import { navItemForPath } from '../data/dashboardNav'

/**
 * The two things that have to happen on every route change but that React
 * Router doesn't do for you: name the page, and count the visit.
 *
 * Both live here rather than in each page component so adding a route is one
 * edit — the same reasoning as dashboardNav.ts, which this reads for the
 * dashboard half of the title map.
 */

const SUFFIX = 'Brandscape'

/** Public routes, which are the ones that get shared and indexed. */
const TITLES: Record<string, string> = {
  '/': 'Brandscape — AI-Powered Marketing Automation',
  '/pricing': `Pricing — ${SUFFIX}`,
  '/login': `Sign in — ${SUFFIX}`,
  '/signup': `Create your account — ${SUFFIX}`,
  '/forgot-password': `Reset your password — ${SUFFIX}`,
  '/auth/reset': `Choose a new password — ${SUFFIX}`,
}

function titleFor(pathname: string): string {
  const exact = TITLES[pathname]
  if (exact) return exact
  if (pathname.startsWith('/invite/')) return `Join an agency — ${SUFFIX}`
  if (pathname.startsWith('/share/')) return `Shared gallery — ${SUFFIX}`
  // Dashboard pages name themselves from the one nav definition.
  const nav = navItemForPath(pathname)
  if (nav) return `${nav.label} — ${SUFFIX}`
  return TITLES['/']
}

export default function RouteEffects() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = titleFor(pathname)
    // Router changes the URL without a load, so autocapture would only ever
    // see the first page. Analytics no-ops when unconfigured.
    trackPageView(pathname)
  }, [pathname])

  return null
}
