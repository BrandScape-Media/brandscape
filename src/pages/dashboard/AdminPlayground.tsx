import { useEffect, useRef, useState } from 'react'
import Markdown from '../../components/Markdown'
import {
  adminChat,
  adminListVoices,
  adminTts,
  adminComfyUploadInput,
  adminComfyRun,
  adminComfyGetRun,
  getOrchestratorHealth,
  type OrchestratorHealth,
  type PlaygroundToolCall,
  type TtsVoice,
  type MediaWorkflow,
  type BenchRun,
} from '../../lib/orchestrator'

/**
 * Staff-only AI Playground: exercise the production LLM (with its live
 * web-search tools), test ElevenLabs voiceovers, and see at a glance which
 * generators are online. Rendered inside AdminPage, so it inherits the
 * platform_admin gate — regular agency accounts never see this.
 */

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tools?: PlaygroundToolCall[]
}

export default function AdminPlayground() {
  const [health, setHealth] = useState<OrchestratorHealth | null | undefined>(undefined)

  useEffect(() => {
    getOrchestratorHealth().then(setHealth)
  }, [])

  return (
    <div className="space-y-6">
      <StatusStrip health={health} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <ChatPanel llmReady={health?.llm_configured ?? true} />
        <VoicePanel ttsReady={health?.tts_configured ?? false} healthLoaded={health !== undefined} />
      </div>
      <WorkflowBench comfyReady={health?.comfy_configured ?? false} healthLoaded={health !== undefined} />
    </div>
  )
}

function StatusStrip({ health }: { health: OrchestratorHealth | null | undefined }) {
  const services: { label: string; state: 'on' | 'off' | 'soon'; note: string }[] = [
    {
      label: 'LLM',
      state: health?.llm_configured ? 'on' : 'off',
      note: health?.llm_configured ? 'Live' : 'LLM_BASE_URL missing',
    },
    {
      label: 'Web Search',
      state: health ? 'on' : 'off',
      note: health ? 'SearXNG + DuckDuckGo' : 'API unreachable',
    },
    {
      label: 'Voiceover',
      state: health?.tts_configured ? 'on' : 'off',
      note: health?.tts_configured ? 'ElevenLabs live' : 'Awaiting API key',
    },
    {
      label: 'Image Gen',
      state: health?.comfy_configured ? 'on' : 'off',
      note: health?.comfy_configured ? 'Product & composite workflows' : 'Awaiting COMFY_URL (tunnel)',
    },
    {
      label: 'Video Gen',
      state: health?.comfy_configured ? 'on' : 'off',
      note: health?.comfy_configured ? 'B-roll & talking-head workflows' : 'Awaiting COMFY_URL (tunnel)',
    },
  ]
  const styles = {
    on: 'bg-green-500/10 border-green-500/20 text-green-400',
    off: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    soon: 'bg-brand-900/40 border-white/5 text-brand-500',
  }
  const dot = { on: 'bg-green-400', off: 'bg-amber-400', soon: 'bg-brand-600' }
  return (
    <div className="flex flex-wrap gap-2.5">
      {services.map((s) => (
        <div key={s.label} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border ${styles[s.state]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot[s.state]} ${s.state === 'on' ? 'animate-pulse' : ''}`} />
          <span className="font-heading font-bold text-[10px] tracking-wider uppercase">{s.label}</span>
          <span className="text-[10px] font-body opacity-70">{s.note}</span>
        </div>
      ))}
    </div>
  )
}

function ChatPanel({ llmReady }: { llmReady: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [useTools, setUseTools] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, sending])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setError(null)
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const res = await adminChat(
        next.map(({ role, content }) => ({ role, content })),
        useTools,
      )
      setMessages([...next, { role: 'assistant', content: res.reply, tools: res.tool_trace }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The model did not answer')
      setMessages(next)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="ai-glow ai-glow-soft rounded-xl">
      <div className="bg-brand-950 rounded-xl border border-white/5 flex flex-col">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-sm text-white">LLM Test Chat</h3>
            <p className="text-brand-600 text-[11px] font-body mt-0.5">
              The exact model + tools the pipeline uses in production.
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useTools}
              onChange={(e) => setUseTools(e.target.checked)}
              className="accent-violet-400"
            />
            <span className="text-brand-400 text-[11px] font-heading tracking-wide">LIVE WEB TOOLS</span>
          </label>
        </div>

        <div ref={scrollRef} className="h-[26rem] overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <p className="text-brand-500 text-sm font-body">
                Ask anything — try <span className="text-brand-300">&quot;search for this week&apos;s TikTok ad trends&quot;</span>
                {' '}to watch it use the live web.
              </p>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] px-4 py-2.5 bg-white/10 rounded-2xl rounded-br-md">
                  <p className="text-white text-sm font-body whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="max-w-[95%]">
                {m.tools && m.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {m.tools.map((t, j) => (
                      <span
                        key={j}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-heading tracking-wide ${
                          t.ok
                            ? 'border-violet-400/30 bg-violet-500/10 text-violet-300'
                            : 'border-red-400/30 bg-red-500/10 text-red-300'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {t.tool}
                        {typeof t.args?.query === 'string' && `: ${String(t.args.query).slice(0, 48)}`}
                        {typeof t.args?.url === 'string' && `: ${String(t.args.url).slice(0, 48)}`}
                      </span>
                    ))}
                  </div>
                )}
                <div className="px-4 py-3 bg-brand-900/50 border border-white/5 rounded-2xl rounded-bl-md">
                  <Markdown>{m.content}</Markdown>
                </div>
              </div>
            ),
          )}
          {sending && (
            <div className="flex items-center gap-2.5">
              <span className="bs-working-badge font-heading font-bold text-[11px] tracking-wider">
                {useTools ? 'THINKING & SEARCHING…' : 'THINKING…'}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-2 px-3.5 py-2.5 bg-red-500/5 border border-red-500/15 rounded-lg">
            <p className="text-red-400 text-xs font-body">{error}</p>
          </div>
        )}

        <div className="p-4 border-t border-white/5 flex gap-2.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            placeholder={llmReady ? 'Message the production model…' : 'LLM endpoint is not configured'}
            disabled={!llmReady}
            className="flex-1 px-4 py-3 bg-brand-900 border border-white/10 rounded-xl text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-none disabled:opacity-40"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim() || !llmReady}
            className="px-5 self-stretch bg-white text-black font-heading font-bold text-xs tracking-wide rounded-xl hover:bg-brand-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? '…' : 'SEND'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VoicePanel({ ttsReady, healthLoaded }: { ttsReady: boolean; healthLoaded: boolean }) {
  const [voices, setVoices] = useState<TtsVoice[]>([])
  const [voiceId, setVoiceId] = useState('')
  const [text, setText] = useState(
    'Your entire creative pipeline, automated. From client brief to finished raws — Brandscape does the producing while your team supervises.',
  )
  const [generating, setGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ttsReady) return
    adminListVoices()
      .then(({ voices }) => {
        setVoices(voices)
        if (voices[0]) setVoiceId((v) => v || voices[0].voice_id)
      })
      .catch(() => undefined)
  }, [ttsReady])

  const generate = async () => {
    if (!text.trim() || generating) return
    setError(null)
    setGenerating(true)
    try {
      const blob = await adminTts(text.trim(), voiceId || undefined)
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-heading font-semibold text-sm text-white">Voiceover Test</h3>
        <p className="text-brand-600 text-[11px] font-body mt-0.5">
          ElevenLabs — the engine that will voice scripts in the pipeline.
        </p>
      </div>

      {healthLoaded && !ttsReady ? (
        <div className="px-4 py-3.5 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg">
          <p className="text-amber-400 text-xs font-body">
            Not configured yet — add <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-300 font-mono">ELEVENLABS_API_KEY</code>{' '}
            to the Railway service variables and this panel goes live.
          </p>
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2500}
            className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-xl text-white font-body text-sm leading-relaxed placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-y"
            placeholder="Script text to voice…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="flex-1 min-w-40 px-3.5 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-brand-200 font-body text-xs focus:outline-none focus:border-white/30 transition-colors"
            >
              {voices.length === 0 && <option value="">Default voice</option>}
              {voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name}
                  {v.category ? ` — ${v.category}` : ''}
                </option>
              ))}
            </select>
            <div className="ai-glow rounded-lg">
              <button
                onClick={generate}
                disabled={generating || !text.trim()}
                className="px-5 py-2.5 bg-brand-950 text-white font-heading font-bold text-xs tracking-wide rounded-lg hover:bg-brand-900 transition-colors disabled:opacity-40"
              >
                {generating ? 'GENERATING…' : 'GENERATE VOICE'}
              </button>
            </div>
          </div>
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full">
              Your browser can&apos;t play this clip.
            </audio>
          )}
        </>
      )}

      {error && (
        <div className="px-3.5 py-2.5 bg-red-500/5 border border-red-500/15 rounded-lg">
          <p className="text-red-400 text-xs font-body">{error}</p>
        </div>
      )}
    </div>
  )
}

// ===== Freeform workflow bench: raw inputs → raw output, no scaffolding =====

const WORKFLOW_META: Record<
  MediaWorkflow,
  { label: string; kind: 'image' | 'video'; needs2: boolean; needsAudio: boolean; hint: string }
> = {
  product: { label: 'Product photo (img2img)', kind: 'image', needs2: false, needsAudio: false, hint: 'One product image + a prompt.' },
  composite: { label: 'Influencer + product', kind: 'image', needs2: true, needsAudio: false, hint: 'Two images (e.g. influencer + product) + a prompt.' },
  broll: { label: 'B-roll (img2video)', kind: 'video', needs2: false, needsAudio: false, hint: 'A start frame + a motion prompt.' },
  talkinghead: { label: 'Talking head (audio→video)', kind: 'video', needs2: false, needsAudio: true, hint: 'A start frame + an audio file. Video runs to the audio length.' },
}

const benchInput =
  'w-full px-3 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors'

function FilePick({
  label,
  file,
  onPick,
  accept,
}: {
  label: string
  file: File | null
  onPick: (f: File | null) => void
  accept: string
}) {
  const url = useObjectUrl(file)
  return (
    <div>
      <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">{label}</label>
      <label className="flex items-center gap-3 px-3 py-2.5 bg-brand-900 border border-dashed border-white/15 rounded-lg cursor-pointer hover:border-white/30 transition-colors">
        {url && accept.startsWith('image') ? (
          <img src={url} alt="" className="w-10 h-10 rounded object-cover" />
        ) : file ? (
          <span className="w-10 h-10 rounded bg-brand-800 flex items-center justify-center text-[9px] font-heading text-brand-400">
            {file.name.split('.').pop()?.toUpperCase()}
          </span>
        ) : (
          <span className="w-10 h-10 rounded bg-brand-800/60 flex items-center justify-center text-brand-600 text-lg">+</span>
        )}
        <span className="text-xs font-body text-brand-300 truncate flex-1">{file ? file.name : 'Choose a file…'}</span>
        <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  )
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setUrl(null)
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

function WorkflowBench({ comfyReady, healthLoaded }: { comfyReady: boolean; healthLoaded: boolean }) {
  const [workflow, setWorkflow] = useState<MediaWorkflow>('broll')
  const [image, setImage] = useState<File | null>(null)
  const [image2, setImage2] = useState<File | null>(null)
  const [audio, setAudio] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [seed, setSeed] = useState('')
  const [duration, setDuration] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<BenchRun | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState(0)

  const meta = WORKFLOW_META[workflow]

  // Poll the active run
  useEffect(() => {
    if (!runId || (run && run.status !== 'running')) return
    const timer = window.setInterval(async () => {
      try {
        setRun(await adminComfyGetRun(runId))
      } catch {
        /* keep polling */
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [runId, run])

  const canRun =
    comfyReady && !busy && image && (!meta.needs2 || image2) && (!meta.needsAudio || audio) && (meta.kind === 'image' ? prompt.trim() : true)

  const go = async () => {
    if (!image) return
    setBusy(true)
    setError(null)
    setRun(null)
    setRunId(null)
    try {
      const image_key = await adminComfyUploadInput(image)
      const image_key_2 = meta.needs2 && image2 ? await adminComfyUploadInput(image2) : undefined
      const audio_key = meta.needsAudio && audio ? await adminComfyUploadInput(audio) : undefined
      const id = await adminComfyRun({
        workflow,
        image_key,
        image_key_2,
        audio_key,
        ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
        ...(seed.trim() ? { seed: Number(seed) } : {}),
        ...(meta.kind === 'video' && duration.trim() ? { duration_seconds: Number(duration) } : {}),
        ...(width.trim() ? { width: Number(width) } : {}),
        ...(height.trim() ? { height: Number(height) } : {}),
      })
      setRunId(id)
      setStartedAt(Date.now())
      setRun({ status: 'running', type: meta.kind, startedAt: Date.now() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the run')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-glow ai-glow-soft rounded-2xl">
      <div className="bg-brand-950 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="font-heading font-semibold text-sm text-white">Workflow Bench</h3>
            <p className="text-brand-600 text-[11px] font-body mt-0.5">
              Fire any pipeline workflow at raw inputs — no project, no influencer. Outputs are scratch (not filed to a library).
            </p>
          </div>
          <select value={workflow} onChange={(e) => setWorkflow(e.target.value as MediaWorkflow)} className="w-auto px-3 py-2 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-xs focus:outline-none focus:border-white/30">
            {(Object.keys(WORKFLOW_META) as MediaWorkflow[]).map((w) => (
              <option key={w} value={w}>{WORKFLOW_META[w].label}</option>
            ))}
          </select>
        </div>

        {healthLoaded && !comfyReady && (
          <div className="mb-4 px-4 py-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg">
            <p className="text-amber-400 text-xs font-body">
              GPU offline — add <code className="bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-300 font-mono">COMFY_URL</code> (the tunnel) in Railway and this bench goes live.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-brand-600 text-[11px] font-body">{meta.hint}</p>
            <FilePick label={meta.kind === 'video' ? 'Start frame' : 'Image'} file={image} onPick={setImage} accept="image/*" />
            {meta.needs2 && <FilePick label="Second image" file={image2} onPick={setImage2} accept="image/*" />}
            {meta.needsAudio && <FilePick label="Audio (voiceover)" file={audio} onPick={setAudio} accept="audio/*" />}
            <div>
              <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">
                Prompt{meta.kind === 'video' && meta.needsAudio ? ' (optional)' : ''}
              </label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Describe the shot…" className={`${benchInput} resize-none`} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Seed</label>
                <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="random" inputMode="numeric" className={benchInput} />
              </div>
              {meta.kind === 'video' && (
                <div>
                  <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Secs</label>
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="auto" inputMode="numeric" className={benchInput} />
                </div>
              )}
              <div>
                <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Width</label>
                <input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="wf" inputMode="numeric" className={benchInput} />
              </div>
              <div>
                <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Height</label>
                <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="wf" inputMode="numeric" className={benchInput} />
              </div>
            </div>
            <p className="text-brand-700 text-[10px] font-body">Blank fields fall back to the workflow's own values.</p>

            <BenchOutput run={run} startedAt={startedAt} />
          </div>
        </div>

        <button
          onClick={go}
          disabled={!canRun}
          className="ai-glow w-full mt-4 py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-xl hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {busy ? 'Uploading…' : run?.status === 'running' ? 'Running…' : !comfyReady ? 'GPU OFFLINE' : 'RUN WORKFLOW'}
        </button>
        {error && <p className="text-red-400 text-xs font-body mt-2">{error}</p>}
      </div>
    </div>
  )
}

function BenchOutput({ run, startedAt }: { run: BenchRun | null; startedAt: number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (run?.status !== 'running') return
    const t = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [run?.status])

  if (!run) {
    return (
      <div className="h-full min-h-32 rounded-lg border border-white/5 bg-brand-900/30 flex items-center justify-center">
        <span className="text-brand-700 text-xs font-body">Output appears here</span>
      </div>
    )
  }
  if (run.status === 'running') {
    const s = Math.max(0, Math.round((Date.now() - startedAt) / 1000))
    return (
      <div className="min-h-32 rounded-lg border border-blue-500/20 bg-blue-500/[0.04] flex flex-col items-center justify-center gap-2 py-6">
        <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        <span className="text-blue-300 text-xs font-heading tracking-wide">
          RENDERING… {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
        </span>
      </div>
    )
  }
  if (run.status === 'failed') {
    return (
      <div className="min-h-32 rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
        <p className="text-red-400 text-[11px] font-heading tracking-wide mb-1">FAILED</p>
        <p className="text-red-400/80 text-[11px] font-body break-words">{run.error}</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-white/10 bg-black overflow-hidden">
      {run.type === 'video' ? (
        <video src={run.view_url} controls playsInline className="w-full max-h-64" />
      ) : run.type === 'image' ? (
        <img src={run.view_url} alt="" className="w-full max-h-64 object-contain" />
      ) : (
        <audio src={run.view_url} controls className="w-full p-3" />
      )}
      <div className="px-3 py-2 flex items-center justify-between bg-brand-950">
        <span className="text-brand-600 text-[10px] font-body">seed {run.seed}</span>
        <a href={run.view_url} target="_blank" rel="noreferrer" download className="text-brand-300 hover:text-white text-[10px] font-heading tracking-wide">
          DOWNLOAD ↓
        </a>
      </div>
    </div>
  )
}
