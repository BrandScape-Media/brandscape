import { useEffect, useRef, useState } from 'react'
import {
  adminComfyStatus,
  adminGenerateMedia,
  adminGetMediaAsset,
  adminListProjects,
  adminListInfluencers,
  type ComfyStatus,
  type AdminProjectSummary,
  type Influencer,
  type AdminMediaAssetState,
} from '../../lib/orchestrator'
import { timeAgo } from '../../lib/format'

/**
 * Media Lab — the testbed that drives the real GPU workflows (local
 * ComfyUI behind a Cloudflare Tunnel now, Runpod later; same API). Used to
 * fine-tune B-roll and talking-head generation before it goes agency-
 * facing. Runs land in the target project's Library as generated assets.
 */

type LabRun = {
  assetId: string
  label: string
  startedAt: number
  state: AdminMediaAssetState | null
}

const gb = (bytes: number | null | undefined) =>
  bytes == null ? '—' : `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`

export default function AdminMediaLab() {
  const [status, setStatus] = useState<ComfyStatus | null>(null)
  const [projects, setProjects] = useState<AdminProjectSummary[]>([])
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [runs, setRuns] = useState<LabRun[]>([])
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = () => {
    adminComfyStatus().then(setStatus).catch(() => setStatus({ configured: false, reachable: false }))
  }

  useEffect(() => {
    refreshStatus()
    adminListProjects().then(setProjects).catch(() => undefined)
    adminListInfluencers().then((list) => setInfluencers(list.filter((i) => i.active))).catch(() => undefined)
  }, [])

  // One shared poller for all in-flight runs
  useEffect(() => {
    const pending = runs.filter((r) => !r.state || r.state.status === 'generating' || r.state.status === 'pending')
    if (pending.length === 0) return
    const timer = window.setInterval(async () => {
      for (const run of pending) {
        try {
          const state = await adminGetMediaAsset(run.assetId)
          setRuns((list) => list.map((r) => (r.assetId === run.assetId ? { ...r, state } : r)))
        } catch {
          /* transient — keep polling */
        }
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [runs])

  const startRun = (assetId: string, label: string) => {
    setRuns((list) => [{ assetId, label, startedAt: Date.now(), state: null }, ...list])
  }

  return (
    <div className="space-y-6">
      <StatusCard status={status} onRefresh={refreshStatus} />

      {error && (
        <div className="px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-red-400 text-xs font-body">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500/60 hover:text-red-400 text-xs font-heading">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <GeneratePanel
          disabled={!status?.reachable}
          projects={projects}
          influencers={influencers}
          onStarted={startRun}
          onError={setError}
        />
        <RunsPanel runs={runs} />
      </div>
    </div>
  )
}

function StatusCard({ status, onRefresh }: { status: ComfyStatus | null; onRefresh: () => void }) {
  return (
    <div className="bg-brand-900/20 border border-white/5 rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            status === null ? 'bg-brand-600 animate-pulse' : status.reachable ? 'bg-green-500' : status.configured ? 'bg-red-500' : 'bg-brand-600'
          }`}
        />
        <span className="font-heading font-semibold text-xs text-white tracking-wide">GPU PIPELINE</span>
      </div>
      {status === null ? (
        <span className="text-brand-600 text-xs font-body">Checking…</span>
      ) : !status.configured ? (
        <span className="text-amber-300/90 text-xs font-body">
          Not connected — add <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono text-amber-200">COMFY_URL</code> in
          Railway once the tunnel is up.
        </span>
      ) : !status.reachable ? (
        <span className="text-red-400 text-xs font-body">
          Configured but unreachable — is ComfyUI + the tunnel running? {status.error && <span className="text-red-500/70">({status.error.slice(0, 120)})</span>}
        </span>
      ) : (
        <>
          <span className="text-green-400 text-xs font-body">Online</span>
          {status.gpu && (
            <span className="text-brand-400 text-xs font-body">
              {status.gpu.name} · {gb(status.gpu.vram_free)} free / {gb(status.gpu.vram_total)}
            </span>
          )}
          {status.comfyui_version && <span className="text-brand-600 text-[11px] font-body">ComfyUI {status.comfyui_version}</span>}
        </>
      )}
      <button
        onClick={onRefresh}
        className="ml-auto px-3 py-1.5 rounded-lg border border-white/10 text-brand-400 hover:text-white hover:border-white/30 text-[10px] font-heading tracking-wide transition-colors"
      >
        REFRESH
      </button>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors'

function GeneratePanel({
  disabled,
  projects,
  influencers,
  onStarted,
  onError,
}: {
  disabled: boolean
  projects: AdminProjectSummary[]
  influencers: Influencer[]
  onStarted: (assetId: string, label: string) => void
  onError: (m: string) => void
}) {
  const [workflow, setWorkflow] = useState<'broll' | 'talkinghead'>('broll')
  const [projectId, setProjectId] = useState('')
  const [influencerId, setInfluencerId] = useState('')
  const [imageId, setImageId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [voText, setVoText] = useState('')
  const [duration, setDuration] = useState(10)
  const [busy, setBusy] = useState(false)

  const influencer = influencers.find((i) => i.id === influencerId) ?? null
  const canRun =
    !disabled &&
    !busy &&
    projectId &&
    influencer &&
    influencer.images.length > 0 &&
    (workflow === 'broll' ? prompt.trim() : voText.trim() && influencer.voice_id)

  const run = async () => {
    if (!canRun || !influencer) return
    setBusy(true)
    try {
      const assetId = await adminGenerateMedia({
        workflow,
        project_id: projectId,
        influencer_id: influencer.id,
        ...(imageId ? { influencer_image_id: imageId } : {}),
        ...(workflow === 'broll'
          ? { prompt: prompt.trim(), duration_seconds: duration }
          : { vo_text: voText.trim(), ...(prompt.trim() ? { prompt: prompt.trim() } : {}) }),
      })
      onStarted(
        assetId,
        workflow === 'broll' ? `B-roll — ${influencer.name}` : `Talking head — ${influencer.name} (${influencer.voice_name})`,
      )
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not start the generation')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-glow ai-glow-soft rounded-2xl">
      <div className="bg-brand-950 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'broll', label: 'B-ROLL' },
              { id: 'talkinghead', label: 'TALKING HEAD' },
            ] as const
          ).map((w) => (
            <button
              key={w.id}
              onClick={() => setWorkflow(w.id)}
              className={`px-4 py-2 rounded-lg text-[11px] font-heading font-bold tracking-wide transition-all ${
                workflow === w.id ? 'bg-white text-black' : 'text-brand-500 hover:text-white border border-white/10'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
              <option value="">— choose —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.agency_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Influencer</label>
            <select
              value={influencerId}
              onChange={(e) => {
                setInfluencerId(e.target.value)
                setImageId('')
              }}
              className={inputCls}
            >
              <option value="">— choose —</option>
              {influencers.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.voice_name ? `· 🎙 ${i.voice_name}` : '· no voice'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {influencer && influencer.images.length > 0 && (
          <div>
            <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">
              Start frame ({imageId ? 'selected' : 'primary'})
            </label>
            <div className="flex gap-2 flex-wrap">
              {influencer.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setImageId(img.id === imageId ? '' : img.id)}
                  className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    imageId === img.id || (!imageId && img.is_primary) ? 'border-violet-400' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {img.view_url ? (
                    <img src={img.view_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-900" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {influencer && influencer.images.length === 0 && (
          <p className="text-amber-400/80 text-xs font-body">This influencer has no reference photos yet — add some in the Influencers tab.</p>
        )}

        {workflow === 'talkinghead' && influencer && !influencer.voice_id && (
          <p className="text-amber-400/80 text-xs font-body">
            {influencer.name} has no voice yet — assign one in the Influencers tab first (the talking head always uses the persona's pinned voice).
          </p>
        )}

        {workflow === 'broll' ? (
          <>
            <div>
              <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Video prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. She holds the serum bottle up to the light, slowly turning it, soft window light, handheld feel…"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="w-40">
              <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Duration (seconds)</label>
              <input
                type="number"
                min={2}
                max={60}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">
                Voiceover script {influencer?.voice_name ? `· spoken by ${influencer.voice_name}` : ''}
              </label>
              <textarea
                value={voText}
                onChange={(e) => setVoText(e.target.value)}
                rows={4}
                placeholder="What should they say? The video will run 1 second longer than the voiceover."
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="block text-brand-500 text-[10px] font-heading tracking-wider uppercase mb-1.5">Scene direction (optional)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="Leave empty to use the workflow's default talking-head scene"
                className={`${inputCls} resize-none`}
              />
            </div>
          </>
        )}

        <button
          onClick={run}
          disabled={!canRun}
          className="ai-glow w-full py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-xl hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {busy ? 'Queuing…' : disabled ? 'GPU OFFLINE' : 'GENERATE'}
        </button>
      </div>
    </div>
  )
}

function RunsPanel({ runs }: { runs: LabRun[] }) {
  return (
    <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
      <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider mb-4">RUNS THIS SESSION</h3>
      {runs.length === 0 ? (
        <p className="text-brand-700 text-xs font-body py-8 text-center">
          Nothing yet — queue a generation and watch it land here (finished files also appear in the project's Library).
        </p>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard key={run.assetId} run={run} />
          ))}
        </div>
      )}
    </div>
  )
}

function RunCard({ run }: { run: LabRun }) {
  const status = run.state?.status ?? 'generating'
  const [, forceTick] = useState(0)
  const elapsed = Math.max(0, Math.round((Date.now() - run.startedAt) / 1000))
  const timerRef = useRef<number>()

  useEffect(() => {
    if (status !== 'generating' && status !== 'pending') return
    timerRef.current = window.setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [status])

  return (
    <div className="bg-brand-900/40 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            status === 'completed' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-xs text-white truncate">{run.label}</p>
          <p className="text-brand-600 text-[10px] font-body mt-0.5">
            {status === 'completed'
              ? `Done · started ${timeAgo(new Date(run.startedAt).toISOString())}`
              : status === 'failed'
                ? 'Failed'
                : `Generating… ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} — long renders are normal on video`}
          </p>
        </div>
      </div>
      {status === 'failed' && run.state?.metadata?.error && (
        <p className="px-4 pb-3 text-red-400/90 text-[11px] font-body break-words">{run.state.metadata.error}</p>
      )}
      {status === 'completed' && run.state?.view_url && (
        <div className="border-t border-white/[0.06] bg-black">
          {run.state.type === 'video' ? (
            <video src={run.state.view_url} controls playsInline className="w-full max-h-72" />
          ) : run.state.type === 'image' ? (
            <img src={run.state.view_url} alt="" className="w-full max-h-72 object-contain" />
          ) : (
            <audio src={run.state.view_url} controls className="w-full p-3" />
          )}
        </div>
      )}
    </div>
  )
}
