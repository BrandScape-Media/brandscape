import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { generateVoiceovers } from '../../lib/orchestrator'
import type { Job } from '../../types'

/**
 * Sits on the Scripts stage once it's approved: turns each VO block into
 * audio in the cast presenter's voice (a separate ElevenLabs generation per
 * block), so the agency can hear and approve the voiceovers before the shoot.
 * Mirrors the tts job's live status via the project's jobs Realtime feed.
 */
export default function VoiceoverControl({
  projectId,
  job,
}: {
  projectId: string
  /** Latest tts (voiceover) job for this project, live via Realtime. */
  job?: Job | null
}) {
  const { demoMode } = useAuth()
  const [busy, setBusy] = useState(false)
  const [justStarted, setJustStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    if (demoMode) {
      setError('Demo mode is read-only — sign in with a real account to generate voiceovers.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await generateVoiceovers(projectId)
      setJustStarted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start voiceover generation.')
    } finally {
      setBusy(false)
    }
  }

  const status = job?.status
  const running = status === 'queued' || status === 'running' || (justStarted && !status)

  return (
    <div className="mt-5 border-t border-white/5 pt-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h4 className="font-heading font-semibold text-sm text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z" />
          </svg>
          Voiceovers
        </h4>
      </div>
      <p className="text-brand-600 text-xs font-body mb-3">
        Generate the audio for every VO line in the cast presenter&apos;s voice. Each clip lands in the Media Library for review — do this once the scripts read the way you want.
      </p>

      {running ? (
        <div className="w-full px-4 py-3 bg-blue-500/[0.06] border border-blue-500/15 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <p className="text-blue-300 text-xs font-body flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            Generating voiceovers — each line is synthesized separately and appears in the Media Library as it finishes.
          </p>
          <Link
            to="/dashboard/library"
            className="shrink-0 px-4 py-2 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
          >
            OPEN LIBRARY
          </Link>
        </div>
      ) : status === 'failed' ? (
        <div className="w-full px-4 py-3 bg-red-500/[0.06] border border-red-500/15 rounded-lg space-y-2">
          <p className="text-red-300 text-xs font-body">Voiceover generation failed: {job?.error ?? 'unknown error'}</p>
          <button
            onClick={start}
            disabled={busy}
            className="px-4 py-2 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40"
          >
            {busy ? 'STARTING…' : 'TRY AGAIN'}
          </button>
        </div>
      ) : status === 'succeeded' ? (
        <div className="w-full px-4 py-3 bg-green-500/[0.06] border border-green-500/15 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <p className="text-green-300 text-xs font-body">
            Voiceovers ready{job?.error ? ` — ${job.error}` : ' — every VO line is in the Media Library.'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/dashboard/library"
              className="px-4 py-2 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
            >
              OPEN LIBRARY
            </Link>
            <button
              onClick={start}
              disabled={busy}
              className="px-3.5 py-2 border border-white/15 text-white font-heading font-bold text-[11px] tracking-wide rounded-lg hover:border-white/30 transition-colors disabled:opacity-40"
            >
              {busy ? 'STARTING…' : 'REGENERATE'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={start}
            disabled={busy}
            className="ai-glow px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z" />
            </svg>
            {busy ? 'Starting…' : 'Generate Voiceovers'}
          </button>
          {error && <p className="text-red-400 text-xs font-body mt-3">{error}</p>}
        </div>
      )}
    </div>
  )
}
