import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Completing sign in…')

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      navigate('/login', { replace: true })
      return
    }

    let cancelled = false

    // supabase-js parses the tokens from the callback URL asynchronously —
    // poll for the session instead of redirecting on a blind timer.
    const startedAt = Date.now()
    const poll = window.setInterval(async () => {
      try {
        const { data: { session } } = await getSupabase().auth.getSession()
        if (cancelled) return
        if (session) {
          window.clearInterval(poll)
          setStatus('Signed in! Redirecting…')
          navigate('/dashboard', { replace: true })
        } else if (Date.now() - startedAt > 10_000) {
          window.clearInterval(poll)
          setStatus('Sign in did not complete. Redirecting…')
          navigate('/login', { replace: true })
        }
      } catch {
        if (!cancelled) {
          window.clearInterval(poll)
          navigate('/login', { replace: true })
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center">
      <div className="text-center">
        <img src="/logo-dark.png" alt="Brandscape" className="h-12 mx-auto mb-6" />
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-brand-400 font-body text-sm">{status}</p>
      </div>
    </div>
  )
}
