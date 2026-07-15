import { useEffect, useState } from 'react'
import type { WorkflowStage } from '../types'

/** Stage-aware status phrases, cycled while a run is in flight. */
const PHRASES: Partial<Record<WorkflowStage, string[]>> = {
  research: [
    'Reading the campaign brief…',
    'Scanning the client profile…',
    'Mapping the competitive landscape…',
    'Pulling audience insights…',
    'Writing up the findings…',
  ],
  ideation: [
    'Absorbing the research…',
    'Hunting for angles…',
    'Testing hooks against the audience…',
    'Shaping the concepts…',
    'Ranking the strongest ideas…',
  ],
  scripts: [
    'Reviewing the chosen concepts…',
    'Finding the brand voice…',
    'Writing the hooks…',
    'Drafting scene by scene…',
    'Tightening the pacing…',
  ],
  shootplan: [
    'Studying the scripts…',
    'Blocking out the shots…',
    'Planning locations and props…',
    'Sequencing the shot list…',
    'Packaging the plan…',
  ],
}

const REVISE_PHRASES = [
  'Re-reading the current output…',
  'Weighing your notes…',
  'Rewriting the affected parts…',
  'Keeping what you liked…',
  'Polishing the result…',
]

const GHOST_LINES = ['88%', '64%', '95%', '72%', '46%']

/**
 * Shown while the orchestrator is generating/revising a stage. A pulsing
 * core, cycling status line, and "ghost paragraph" that writes itself make
 * it unmistakable that the AI is working — the real output replaces this
 * live via Realtime.
 */
export default function AiWorking({ stage, revising }: { stage: WorkflowStage; revising?: boolean }) {
  const phrases = revising ? REVISE_PHRASES : PHRASES[stage] ?? ['Thinking…', 'Structuring the output…', 'Writing…']
  const [phraseIdx, setPhraseIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % phrases.length), 2600)
    return () => clearInterval(t)
  }, [phrases.length])

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-blue-600/[0.04] via-transparent to-purple-600/[0.04] px-6 py-10">
      {/* slow light sweep across the whole panel */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bs-panel-sweep absolute inset-y-0 w-1/3" />
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* pulsing core with expanding rings */}
        <div className="relative w-14 h-14 mb-5 flex items-center justify-center">
          <span className="bs-ring absolute inset-0 rounded-full border border-blue-400/40" />
          <span className="bs-ring absolute inset-0 rounded-full border border-purple-400/30" style={{ animationDelay: '0.9s' }} />
          <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 bs-core" />
        </div>

        <p className="font-heading font-bold text-sm text-white tracking-wide mb-1.5">
          {revising ? 'AI IS REVISING THIS STAGE' : 'AI IS WORKING'}
        </p>
        {/* cycling status line; key remount re-triggers the fade */}
        <p key={phraseIdx} className="bs-phrase text-brand-400 text-xs font-body h-4">
          {phrases[phraseIdx]}
        </p>

        {/* ghost paragraph writing itself */}
        <div className="w-full max-w-md mt-8 space-y-2.5" aria-hidden>
          {GHOST_LINES.map((w, i) => (
            <div key={i} className="flex items-center">
              <div
                className="bs-ghost-line h-2 rounded-full bg-gradient-to-r from-white/[0.09] to-white/[0.04]"
                style={{ '--w': w, animationDelay: `${i * 0.55}s` } as React.CSSProperties}
              />
              {i === GHOST_LINES.length - 1 && <span className="bs-caret ml-1.5 h-3 w-0.5 rounded bg-blue-400/80" />}
            </div>
          ))}
        </div>

        <p className="text-brand-700 text-[10px] font-body mt-8">
          This updates live — you can keep working elsewhere in the meantime.
        </p>
      </div>
    </div>
  )
}
