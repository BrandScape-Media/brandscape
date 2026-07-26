/**
 * An agency invite token clicked while logged out.
 *
 * We can't accept it at that point — accepting sets `profiles.agency_id` for
 * `auth.uid()`, and there is no session yet. So the token is parked here,
 * survives both the signup form and the Google OAuth round-trip, and is picked
 * up by the onboarding screen once the account exists.
 *
 * Same shape and same reasoning as checkoutIntent.ts, including sessionStorage
 * over localStorage: an abandoned invite should die with the tab rather than
 * silently move someone into an agency next week.
 */

const KEY = 'brandscape:invite-token'

export function saveInviteToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token)
  } catch {
    /* private browsing / storage disabled — they can re-open the link */
  }
}

/**
 * Read and clear in one go.
 *
 * Consuming matters: onboarding redirects to the invite page when a token is
 * parked, and the invite page sends a failed accept back to the dashboard,
 * which bounces off onboarding again. Leaving the token in place would make
 * that a loop.
 */
export function takeInviteToken(): string | null {
  try {
    const token = sessionStorage.getItem(KEY)
    if (token) sessionStorage.removeItem(KEY)
    return token
  } catch {
    return null
  }
}

export function clearInviteToken(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}
