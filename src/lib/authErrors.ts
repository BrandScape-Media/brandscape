/**
 * Turn a Supabase auth failure into something a human can act on.
 *
 * Written after a real incident: custom SMTP was configured with the wrong
 * credentials, Supabase returned 500 `unexpected_failure` with a body that
 * serialised to the string "{}", and the UI dutifully rendered `{}` to the
 * user. Two braces. Nothing about what went wrong, nothing about whose fault
 * it was, nothing to do next.
 *
 * The rule here: a 5xx from the auth server is OUR problem, and the message
 * should say so rather than implying the person typed their address wrong.
 * The real error still goes to the console for whoever is debugging.
 */

interface MaybeAuthError {
  message?: unknown
  status?: unknown
  code?: unknown
  name?: unknown
}

/** Messages that carry no information — Supabase emits these on a 500. */
function isUseless(message: string): boolean {
  const trimmed = message.trim()
  return trimmed === '' || trimmed === '{}' || trimmed === '[object Object]' || trimmed === 'null'
}

export function authErrorMessage(err: unknown, fallback: string): string {
  // Always leave a trail — the user-facing copy is deliberately vague, so the
  // console is where the actual cause has to survive.
  if (err) console.error('[auth]', err)

  const e = (err ?? {}) as MaybeAuthError
  const status = typeof e.status === 'number' ? e.status : undefined
  const code = typeof e.code === 'string' ? e.code : undefined
  const message = typeof e.message === 'string' ? e.message : ''

  // Server-side failure. In practice this is almost always the mail provider
  // rejecting us — the account is fine and retrying later usually works.
  if ((status !== undefined && status >= 500) || code === 'unexpected_failure') {
    return "We couldn't send that email — the problem is on our side, not with your address. Please try again in a few minutes, or contact us if it keeps happening."
  }

  if (status === 429 || code === 'over_email_send_rate_limit') {
    return 'Too many attempts just now. Wait a minute and try again.'
  }

  return isUseless(message) ? fallback : message
}
