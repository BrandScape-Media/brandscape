import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client'
import { authErrorMessage } from '../lib/authErrors'

/**
 * Step one of password recovery.
 *
 * Supabase Auth owns the whole flow — we only collect the address and tell it
 * where to send people back to. Two pieces of project config it depends on:
 *
 *  - a real custom SMTP provider. The built-in sender is rate-limited to a
 *    handful of messages an hour and lands in spam, which is indistinguishable
 *    from "reset is broken" for the person locked out.
 *  - `/auth/reset` on every origin we serve must be in the Auth redirect
 *    allowlist, or Supabase silently swaps it for the Site URL and the link
 *    lands on the homepage with the tokens attached.
 *
 * The recovery tokens ride in the URL *fragment*, which matters here because
 * this is a static SPA: /auth/reset 404s, public/404.html re-appends `l.hash`
 * to its redirect, and the restore script in index.html puts it back before
 * any module loads. Break either of those and reset dies silently.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) {
        throw new Error('Authentication is not configured in this environment.')
      }
      const { error: err } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (err) throw err
      // Deliberately the same message whether or not the address exists —
      // otherwise this page is an account-enumeration oracle.
      setSent(true)
    } catch (err: unknown) {
      setError(authErrorMessage(err, 'Could not send the reset link.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-block mb-8">
          <img src="/logo-transparent.png" alt="Brandscape" className="h-14 w-auto mx-auto" />
        </Link>

        <div className="bg-brand-900/30 border border-white/5 rounded-2xl p-8">
          {sent ? (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">Check your email</h1>
              <p className="text-brand-400 text-sm font-body leading-relaxed">
                If there&apos;s an account for <span className="text-white">{email}</span>, a reset link
                is on its way. It expires in an hour. Check your spam folder if it hasn&apos;t
                arrived in a few minutes.
              </p>
              <Link
                to="/login"
                className="mt-6 w-full inline-flex justify-center px-5 py-3.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-xl hover:bg-brand-200 transition-all duration-300"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-heading font-bold text-xl text-white mb-2">Reset your password</h1>
              <p className="text-brand-400 text-sm font-body mb-6">
                We&apos;ll email you a link to choose a new one.
              </p>

              {error && (
                <div className="mb-5 px-4 py-3.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-sm font-body">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-heading text-brand-400 mb-2 tracking-wide">
                    EMAIL
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3.5 bg-brand-900/50 border border-white/10 rounded-xl text-white font-body text-sm placeholder:text-brand-500 focus:outline-none focus:border-white/25 focus:bg-brand-900/70 transition-all"
                    placeholder="you@agency.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-5 py-3.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-xl hover:bg-brand-200 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-brand-500 text-sm mt-6 font-body">
          Remembered it?{' '}
          <Link to="/login" className="text-white hover:text-brand-300 font-heading font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
