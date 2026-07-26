import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { saveInviteToken, clearInviteToken } from '../lib/inviteIntent'
import * as api from '../lib/api'
import type { InvitePeek } from '../types'

/**
 * Where an agency invite link lands.
 *
 * Accepting sets profiles.agency_id for auth.uid(), so it needs a session. If
 * there isn't one the token is parked in sessionStorage and we send them to
 * signup — the onboarding screen picks it up on the other side, exactly the
 * way a plan chosen on the pricing page survives signup via checkoutIntent.
 */
export default function InvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, refreshProfile } = useAuth()
  const [peek, setPeek] = useState<InvitePeek | null>(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  // Only park it for a signed-OUT visitor, who is about to be sent through
  // signup — this is what survives the trip, including the Google OAuth
  // round-trip that leaves the site entirely.
  //
  // Not for a signed-in one: onboarding consumes a parked token by redirecting
  // here, so re-parking it would make a failed accept loop between the two.
  useEffect(() => {
    if (token && !authLoading && !user) saveInviteToken(token)
  }, [token, authLoading, user])

  useEffect(() => {
    if (!token || authLoading || !user) return
    let cancelled = false
    api
      .peekAgencyInvite(token)
      .then((p) => {
        if (!cancelled) setPeek(p)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not read that invite.')
      })
    return () => {
      cancelled = true
    }
  }, [token, user, authLoading])

  const join = useCallback(async () => {
    setError('')
    setJoining(true)
    try {
      const result = await api.acceptAgencyInvite(token)
      if (result.ok) {
        clearInviteToken()
        await refreshProfile()
        navigate('/dashboard', { replace: true })
        return
      }
      setError(MESSAGES[result.error] ?? 'That invite could not be accepted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That invite could not be accepted.')
    } finally {
      setJoining(false)
    }
  }, [token, navigate, refreshProfile])

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-block mb-8">
          <img src="/logo-transparent.png" alt="Brandscape" className="h-14 w-auto mx-auto" />
        </Link>

        <div className="bg-brand-900/30 border border-white/5 rounded-2xl p-8">
          {authLoading ? (
            <Spinner label="Checking your session…" />
          ) : !user ? (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">You&apos;ve been invited</h1>
              <p className="text-brand-400 text-sm font-body mb-6 leading-relaxed">
                Create your account (or sign in) and we&apos;ll add you to the agency straight after.
                Use the address the invite was sent to.
              </p>
              <Link
                to="/signup"
                className="w-full inline-flex justify-center px-5 py-3.5 bg-white text-black font-heading font-bold text-sm rounded-xl hover:bg-brand-200 transition-colors"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="mt-3 w-full inline-flex justify-center px-5 py-3.5 border border-white/10 text-white font-heading font-bold text-sm rounded-xl hover:border-white/25 transition-colors"
              >
                I already have one
              </Link>
            </>
          ) : error ? (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">Can&apos;t join</h1>
              <p className="text-brand-400 text-sm font-body leading-relaxed">{error}</p>
              <Link
                to="/dashboard"
                className="mt-6 w-full inline-flex justify-center px-5 py-3.5 border border-white/10 text-white font-heading font-bold text-sm rounded-xl hover:border-white/25 transition-colors"
              >
                Go to dashboard
              </Link>
            </>
          ) : !peek ? (
            <Spinner label="Reading your invite…" />
          ) : !peek.ok ? (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">
                {peek.error === 'expired' ? 'Invite expired' : 'Invite not valid'}
              </h1>
              <p className="text-brand-400 text-sm font-body leading-relaxed">
                {MESSAGES[peek.error]}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">
                Join {peek.agency_name}
              </h1>
              <p className="text-brand-400 text-sm font-body mb-6 leading-relaxed">
                You&apos;ll join as a <span className="text-white">{peek.role}</span> and share the
                agency&apos;s clients, projects and credits. This invite was issued to{' '}
                <span className="text-white">{peek.email}</span>.
              </p>
              <button
                onClick={() => void join()}
                disabled={joining}
                className="w-full px-5 py-3.5 bg-white text-black font-heading font-bold text-sm rounded-xl hover:bg-brand-200 transition-colors disabled:opacity-40"
              >
                {joining ? 'Joining…' : `Join ${peek.agency_name}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const MESSAGES: Record<string, string> = {
  not_found: 'That invite link is not recognised. Ask whoever invited you for a fresh one.',
  already_accepted: 'That invite has already been used. Ask for a new one if you still need access.',
  expired: 'Invites last 7 days. Ask whoever invited you to send a new link.',
  not_signed_in: 'Sign in first, then open the link again.',
  no_profile: 'Your account is still being set up. Refresh in a moment and try again.',
  wrong_account:
    'This invite was issued to a different email address. Sign in with that address, or ask for an invite to the one you use.',
  already_in_agency:
    'You already belong to an agency. Leaving one would orphan the work you did there, so an owner needs to remove you first.',
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-brand-400 text-sm font-body">
      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      {label}
    </div>
  )
}
