import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { runShoot } from '../../lib/orchestrator'

/**
 * The Raws / Shooting stage control: kicks off the automated shoot (image
 * shots → video clips → VO) from the approved shoot plan. The render runs in
 * the background — finished clips appear in the Media Library — so this just
 * starts it and points the user there.
 */
export default function ShootControl({
  projectId,
  shootplanDone,
}: {
  projectId: string
  shootplanDone: boolean
}) {
  const { demoMode } = useAuth()
  const [busy, setBusy] = useState(false)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    if (demoMode) {
      setError('Demo mode is read-only — sign in with a real account to run a shoot.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await runShoot(projectId)
      setStarted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the shoot.')
    } finally {
      setBusy(false)
    }
  }

  if (!shootplanDone) {
    return (
      <span className="text-brand-600 text-xs font-body">
        Complete and approve the Shoot Plan first — the shoot renders from it.
      </span>
    )
  }

  if (started) {
    return (
      <div className="w-full px-4 py-3 bg-green-500/[0.06] border border-green-500/15 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <p className="text-green-300 text-xs font-body">
          Shoot started — clips render in the background and appear in the Media Library as they finish. Long renders are normal.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/dashboard/library"
            className="px-4 py-2 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
          >
            OPEN LIBRARY
          </Link>
          <button
            onClick={() => setStarted(false)}
            className="px-3.5 py-2 border border-white/15 text-white font-heading font-bold text-[11px] tracking-wide rounded-lg hover:border-white/30 transition-colors"
          >
            RUN AGAIN
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={start}
          disabled={busy}
          className="ai-glow px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2 disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {busy ? 'Starting…' : 'Run Shoot — Generate the Videos'}
        </button>
        <span className="text-brand-600 text-xs font-body">
          Uses the cast + shoot plan. Product shots and clips land in the Library.
        </span>
      </div>
      {error && <p className="text-red-400 text-xs font-body mt-3">{error}</p>}
    </div>
  )
}
