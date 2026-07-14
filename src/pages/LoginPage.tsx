import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase/client'
import MetalLogo from '../components/MetalLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle, signInWithEmail, signInAsDemo } = useAuth()
  const navigate = useNavigate()
  const configured = isSupabaseConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[160px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <MetalLogo heightClass="h-20" className="self-start mb-14" />
          <h2 className="font-heading font-black text-4xl tracking-tight mb-6 leading-tight">
            Your Creative Pipeline,
            <br />
            <span className="text-brand-400">Finally Automated.</span>
          </h2>
          <p className="text-brand-500 font-body text-lg leading-relaxed max-w-md">
            Sign in to access your agency dashboard and continue automating content production at scale.
          </p>
          <div className="mt-16 grid grid-cols-3 gap-8">
            {[
              { value: '10x', label: 'Faster Production' },
              { value: '8', label: 'AI Modules' },
              { value: '100%', label: 'Agency Ready' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-heading font-black text-2xl text-white">{s.value}</div>
                <div className="text-brand-600 text-[10px] font-heading tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-brand-black">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-block">
              <img src="/logo-transparent.png" alt="Brandscape" className="h-20 w-auto mx-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.18)]" />
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-heading font-bold text-2xl text-white">Welcome back</h1>
            <p className="text-brand-500 text-sm font-body mt-2">
              Sign in to your agency dashboard
            </p>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white text-black font-heading font-semibold text-sm rounded-xl hover:bg-brand-200 transition-all duration-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-brand-700 text-xs font-heading tracking-wider">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-400 text-sm font-body flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-heading text-brand-400 mb-2 tracking-wide">
                EMAIL
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-brand-900/50 border border-white/10 rounded-xl text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/25 focus:bg-brand-900/70 transition-all"
                placeholder="you@agency.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-heading text-brand-400 mb-2 tracking-wide">
                PASSWORD
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 bg-brand-900/50 border border-white/10 rounded-xl text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/25 focus:bg-brand-900/70 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-5 py-3.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-xl hover:bg-brand-200 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Mode Banner */}
          {!configured && (
            <div className="mt-6 mb-2 p-4 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl">
              <p className="text-amber-400 text-xs font-body mb-3">
                Supabase is not configured. Set up <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-300 font-mono">.env.local</code> for full auth, or browse the dashboard in demo mode.
              </p>
              <button
                onClick={() => {
                  signInAsDemo()
                  navigate('/dashboard')
                }}
                className="w-full px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 font-heading font-bold text-xs tracking-wide rounded-lg hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                TRY DEMO MODE
              </button>
            </div>
          )}

          {/* Sign up link */}
          <p className="text-center text-brand-600 text-sm mt-8 font-body">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-white hover:text-brand-300 font-heading font-semibold transition-colors">
              Start free trial
            </Link>
          </p>

          {/* Back */}
          <div className="text-center mt-6">
            <Link to="/" className="text-brand-700 hover:text-brand-500 text-xs font-heading transition-colors flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
