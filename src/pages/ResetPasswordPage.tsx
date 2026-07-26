import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client'
import { authErrorMessage } from '../lib/authErrors'

/**
 * Step two of password recovery — where the emailed link lands.
 *
 * Supabase puts the recovery tokens in the URL *fragment* and swaps them for
 * a session asynchronously, exactly like the OAuth callback, so we poll for
 * the session rather than redirecting on a blind timer (same reasoning as
 * AuthCallback.tsx). An expired or reused link comes back as an error in that
 * same fragment, which is worth reading before spinning for ten seconds.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLinkError('Authentication is not configured in this environment.')
      return
    }

    // Supabase reports a dead link as error_description in the fragment.
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const described = fragment.get('error_description')
    if (described) {
      setLinkError(
        described.replace(/\+/g, ' ') +
          '. Reset links are single-use and expire after an hour — request a new one.',
      )
      return
    }

    let cancelled = false
    const startedAt = Date.now()
    const poll = window.setInterval(async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession()
        if (cancelled) return
        if (session) {
          window.clearInterval(poll)
          setReady(true)
        } else if (Date.now() - startedAt > 10_000) {
          window.clearInterval(poll)
          setLinkError('That reset link is no longer valid. Request a new one and try again.')
        }
      } catch {
        if (cancelled) return
        window.clearInterval(poll)
        setLinkError('Could not verify the reset link.')
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.")
      return
    }
    setSaving(true)
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      // The recovery session is a real session, so they're already signed in.
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
    } catch (err: unknown) {
      setError(authErrorMessage(err, 'Could not update your password.'))
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-block mb-8">
          <img src="/logo-transparent.png" alt="Brandscape" className="h-14 w-auto mx-auto" />
        </Link>

        <div className="bg-brand-900/30 border border-white/5 rounded-2xl p-8">
          {linkError ? (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">Link expired</h1>
              <p className="text-brand-400 text-sm font-body leading-relaxed">{linkError}</p>
              <Link
                to="/forgot-password"
                className="mt-6 w-full inline-flex justify-center px-5 py-3.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-xl hover:bg-brand-200 transition-all duration-300"
              >
                Request a new link
              </Link>
            </>
          ) : done ? (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">Password updated</h1>
              <p className="text-brand-400 text-sm font-body">Taking you to your dashboard…</p>
            </>
          ) : !ready ? (
            <div className="flex items-center gap-3 text-brand-400 text-sm font-body">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Verifying your link…
            </div>
          ) : (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">Choose a new password</h1>
              <p className="text-brand-400 text-sm font-body mb-6">
                At least 8 characters. You&apos;ll be signed in straight after.
              </p>

              {error && (
                <div className="mb-5 px-4 py-3.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-sm font-body">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-heading text-brand-400 mb-2 tracking-wide">
                    NEW PASSWORD
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3.5 bg-brand-900/50 border border-white/10 rounded-xl text-white font-body text-sm placeholder:text-brand-500 focus:outline-none focus:border-white/25 focus:bg-brand-900/70 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-xs font-heading text-brand-400 mb-2 tracking-wide">
                    CONFIRM
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3.5 bg-brand-900/50 border border-white/10 rounded-xl text-white font-body text-sm placeholder:text-brand-500 focus:outline-none focus:border-white/25 focus:bg-brand-900/70 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-5 py-3.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-xl hover:bg-brand-200 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
