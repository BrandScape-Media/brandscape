import { useEffect, useRef, useState } from 'react'

/**
 * Auto-playing recreation of the real dashboard pipeline: each stage
 * "thinks" (ghost lines), writes its output line by line, completes, and
 * hands off to the next — including a chat revision beat on Ideation and a
 * generated-media grid on Raws. Visitors can click any stage to jump.
 * Pure CSS/state, no video assets.
 */

type Phase = 'thinking' | 'writing' | 'done'

interface DemoStage {
  key: string
  label: string
  thinking: string
  lines: Array<{ kind: 'h' | 'b' | 'p'; text: string }>
  media?: boolean
}

const STAGES: DemoStage[] = [
  {
    key: 'research',
    label: 'Research',
    thinking: 'Mapping the competitive landscape…',
    lines: [
      { kind: 'h', text: 'Market Snapshot — Aurora Skincare' },
      { kind: 'p', text: 'Audience skews 24–34, discovery happens on TikTok & Reels.' },
      { kind: 'b', text: 'Competitors lean clinical — a warmer voice is open space' },
      { kind: 'b', text: '"Glass skin" searches up 41% QoQ in target region' },
      { kind: 'b', text: 'UGC-style demos outperform studio ads 3:1 on CTR' },
    ],
  },
  {
    key: 'ideation',
    label: 'Ideation',
    thinking: 'Testing hooks against the audience…',
    lines: [
      { kind: 'h', text: '3 Concepts, A/B-ready' },
      { kind: 'b', text: 'A — "Skin diary": 7-day transformation, raw phone footage' },
      { kind: 'b', text: 'B — "The 20-second routine" speedrun with satisfying macro shots' },
      { kind: 'b', text: 'C — Founder myth-busting series, duet-bait format' },
      { kind: 'p', text: 'Recommended: lead with B for paid, A for organic.' },
    ],
  },
  {
    key: 'scripts',
    label: 'Scripts',
    thinking: 'Writing hooks, tightening pacing…',
    lines: [
      { kind: 'h', text: 'Script B1 — 30s vertical' },
      { kind: 'p', text: 'HOOK (0–3s): "Your routine has 9 steps. Mine has 2."' },
      { kind: 'p', text: 'BEAT 2 (3–12s): macro pump shot → application, cut on motion.' },
      { kind: 'p', text: 'BEAT 3 (12–24s): side-by-side glow comparison, no filter claim.' },
      { kind: 'p', text: 'CTA (24–30s): "Two steps. That’s the whole ad." → shop link.' },
    ],
  },
  {
    key: 'shootplan',
    label: 'Shoot Plan',
    thinking: 'Blocking shots, planning props…',
    lines: [
      { kind: 'h', text: 'Shot List — 6 setups' },
      { kind: 'b', text: 'A-roll: talent VO, window light, 35mm look' },
      { kind: 'b', text: 'B-roll: macro product pump (120fps), texture swatch pull' },
      { kind: 'b', text: 'Generated stills: hero bottle on travertine, dawn palette' },
      { kind: 'p', text: 'Image-to-video prompts prepared from approved stills.' },
    ],
  },
  {
    key: 'shooting',
    label: 'Raws',
    thinking: 'Generating stills, animating clips…',
    lines: [],
    media: true,
  },
]

const THUMBS = [
  'from-rose-400/50 via-orange-300/40 to-amber-200/30',
  'from-sky-400/50 via-indigo-400/40 to-purple-400/30',
  'from-emerald-400/50 via-teal-300/40 to-cyan-300/30',
  'from-fuchsia-400/50 via-pink-400/40 to-rose-300/30',
  'from-amber-400/50 via-yellow-300/40 to-lime-300/30',
  'from-violet-400/50 via-purple-300/40 to-indigo-300/30',
]

const THINK_MS = 2300
const LINE_MS = 620
const HOLD_MS = 2100

export default function DemoWindow() {
  const [stageIdx, setStageIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('thinking')
  const [visibleLines, setVisibleLines] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [revision, setRevision] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const stage = STAGES[stageIdx]
  const lineCount = stage.media ? THUMBS.length : stage.lines.length

  // one state machine tick per phase change
  useEffect(() => {
    clearTimeout(timer.current)
    if (phase === 'thinking') {
      timer.current = setTimeout(() => {
        setVisibleLines(0)
        setPhase('writing')
      }, THINK_MS)
    } else if (phase === 'writing') {
      if (visibleLines < lineCount) {
        timer.current = setTimeout(() => setVisibleLines((n) => n + 1), stage.media ? 380 : LINE_MS)
      } else {
        setPhase('done')
      }
    } else {
      // show the chat-revision beat once, on Ideation
      const isIdeation = stage.key === 'ideation'
      setCompleted((prev) => new Set(prev).add(stage.key))
      if (isIdeation) setRevision(true)
      timer.current = setTimeout(() => {
        setRevision(false)
        if (stageIdx < STAGES.length - 1) {
          setStageIdx(stageIdx + 1)
          setPhase('thinking')
        } else {
          // loop
          setCompleted(new Set())
          setStageIdx(0)
          setPhase('thinking')
        }
      }, isIdeation ? HOLD_MS + 1400 : HOLD_MS)
    }
    return () => clearTimeout(timer.current)
  }, [phase, visibleLines, stageIdx, lineCount, stage.key, stage.media])

  const jumpTo = (i: number) => {
    clearTimeout(timer.current)
    setStageIdx(i)
    setVisibleLines(0)
    setRevision(false)
    setPhase('thinking')
  }

  return (
    <div className="demo-window-enter relative mx-auto max-w-4xl">
      {/* halo */}
      <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl rounded-[3rem] -z-10" />

      <div className="rounded-2xl border border-white/10 bg-brand-950/90 backdrop-blur-xl overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] text-left">
        {/* title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-brand-900/40">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-brand-500 text-[11px] font-heading tracking-wide truncate">
            app.brandscape.media — Aurora Skincare · Summer Launch
          </span>
          <span className="ml-auto hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-400/20">
            <span className="bs-working-badge text-[9px] font-heading font-bold tracking-wider">LIVE PIPELINE</span>
          </span>
        </div>

        <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[150px_1fr]">
          {/* stage rail */}
          <div className="border-r border-white/5 py-3 px-2 space-y-0.5 bg-brand-900/20">
            {STAGES.map((s, i) => {
              const active = i === stageIdx
              const isDone = completed.has(s.key)
              return (
                <button
                  key={s.key}
                  onClick={() => jumpTo(i)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all ${
                    active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isDone ? 'bg-green-500' : active ? 'bg-blue-500 animate-pulse' : 'bg-brand-700'
                    }`}
                  />
                  <span className={`text-[10px] font-heading tracking-wider truncate ${active ? 'text-white font-bold' : 'text-brand-500'}`}>
                    {s.label.toUpperCase()}
                  </span>
                </button>
              )
            })}
            <div className="pt-3 px-2.5 hidden sm:block">
              <p className="text-brand-700 text-[9px] font-body leading-relaxed">Click a stage — this is the real pipeline flow.</p>
            </div>
          </div>

          {/* stage panel */}
          <div className="relative p-5 sm:p-6 min-h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-sm text-white">{stage.label}</h3>
              {phase === 'done' ? (
                <span className="px-2.5 py-1 rounded-md bg-green-500/15 text-green-400 text-[9px] font-heading font-bold tracking-wider">COMPLETED</span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-400/20">
                  <span className="bs-working-badge text-[9px] font-heading font-bold tracking-wider">
                    {phase === 'thinking' ? 'AI WORKING' : 'WRITING'}
                  </span>
                </span>
              )}
            </div>

            {phase === 'thinking' ? (
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="relative flex w-8 h-8 items-center justify-center">
                    <span className="bs-ring absolute inset-0 rounded-full border border-blue-400/40" />
                    <span className="w-2.5 h-2.5 rounded-full bs-core bs-core--ai" />
                  </span>
                  <p className="text-brand-400 text-xs font-body">{stage.thinking}</p>
                </div>
                <div className="space-y-2.5 max-w-md" aria-hidden>
                  {['86%', '64%', '92%', '55%'].map((w, i) => (
                    <div
                      key={i}
                      className="bs-ghost-line h-2 rounded-full bg-gradient-to-r from-white/[0.09] to-white/[0.04]"
                      style={{ '--w': w, animationDelay: `${i * 0.5}s` } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
            ) : stage.media ? (
              <div>
                <div className="grid grid-cols-3 gap-2.5">
                  {THUMBS.slice(0, visibleLines || (phase === 'done' ? THUMBS.length : 0)).map((g, i) => (
                    <div key={i} className={`demo-thumb aspect-video rounded-lg bg-gradient-to-br ${g} border border-white/10 relative overflow-hidden`}>
                      {i >= 4 && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/50 text-white/80 text-[8px] font-heading font-bold tracking-wider">
                          VIDEO
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {phase === 'done' && (
                  <p className="demo-line text-brand-500 text-[11px] font-body mt-4">
                    4 stills + 2 clips generated from approved shoot-plan prompts → client library.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-w-lg">
                {stage.lines.slice(0, visibleLines).map((line, i) => (
                  <div key={i} className="demo-line">
                    {line.kind === 'h' ? (
                      <p className="font-heading font-bold text-[13px] text-white">{line.text}</p>
                    ) : line.kind === 'b' ? (
                      <p className="text-brand-300 text-xs font-body flex gap-2">
                        <span className="text-brand-600 flex-shrink-0">•</span>
                        {line.text}
                      </p>
                    ) : (
                      <p className="text-brand-400 text-xs font-body">{line.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* chat revision beat */}
            {revision && (
              <div className="demo-line absolute bottom-4 right-4 left-4 sm:left-auto sm:w-72 rounded-xl border border-white/10 bg-brand-900/95 backdrop-blur p-3 shadow-2xl">
                <p className="text-[9px] font-heading tracking-wider text-brand-500 mb-2">AI ASSISTANT</p>
                <div className="flex justify-end mb-1.5">
                  <span className="bg-white text-black text-[10px] font-body px-2.5 py-1.5 rounded-lg">make concept B punchier</span>
                </div>
                <div className="flex">
                  <span className="bg-brand-800 text-brand-300 text-[10px] font-body px-2.5 py-1.5 rounded-lg border border-white/5">
                    On it — rewriting now. Updates live.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
