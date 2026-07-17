import { useEffect, useRef, useState } from 'react'
import Markdown from '../../components/Markdown'
import {
  adminChat,
  adminListVoices,
  adminTts,
  getOrchestratorHealth,
  type OrchestratorHealth,
  type PlaygroundToolCall,
  type TtsVoice,
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
    { label: 'Image Gen', state: 'soon', note: 'GPU pipeline — not deployed yet' },
    { label: 'Video Gen', state: 'soon', note: 'GPU pipeline — not deployed yet' },
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
