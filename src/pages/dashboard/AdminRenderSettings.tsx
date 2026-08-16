import { useEffect, useState } from 'react'
import {
  adminGetRenderSettings,
  adminSetRenderChains,
  type RenderBackend,
  type RenderSettings,
} from '../../lib/orchestrator'

/**
 * Which machine runs a generation, and in what order it is tried.
 *
 * This exists because a silent fallback is indistinguishable from success: a
 * render that quietly ran on the local box looks exactly like one the GPU cloud
 * handled. Pinning a chain to a single backend is the only way to make a
 * backend fail out loud so it can be debugged.
 */

const BACKEND_LABEL: Record<RenderBackend, string> = {
  gemini: 'Google image API',
  runpod: 'GPU cloud',
  local: 'Local workstation',
}

const BACKEND_NOTE: Record<RenderBackend, string> = {
  gemini: 'Stills only. No GPU of ours, so no cold start and no capacity risk — seconds, not minutes.',
  runpod: 'Rented GPUs, scale to zero. Cold start several minutes, then ~90s an image.',
  local: 'The studio workstation over its tunnel. Always warm, but only as up as that machine.',
}

type Preset = { id: string; chain: RenderBackend[]; label: string; hint: string }

/** Every ordering worth offering, spelled out rather than drag-to-reorder. */
const VIDEO_PRESETS: Preset[] = [
  { id: 'runpod-local', chain: ['runpod', 'local'], label: 'GPU cloud, then local', hint: 'Normal running. Local catches what the cloud cannot place.' },
  { id: 'local-runpod', chain: ['local', 'runpod'], label: 'Local, then GPU cloud', hint: 'Cheapest. Ties uptime to the workstation being on.' },
  { id: 'runpod', chain: ['runpod'], label: 'GPU cloud only', hint: 'For debugging: renders fail here instead of quietly succeeding elsewhere.' },
  { id: 'local', chain: ['local'], label: 'Local only', hint: 'For debugging, or while the cloud endpoint is being rebuilt.' },
]

// Images lead with Google — it needs no GPU at all, so it sidesteps every
// capacity and cold-start problem the video path has. Flux stays underneath as
// the known-good reference for when a key expires or Google refuses a prompt.
const IMAGE_PRESETS: Preset[] = [
  { id: 'gemini-runpod-local', chain: ['gemini', 'runpod', 'local'], label: 'Google, then GPU cloud, then local', hint: 'Normal running. Fastest and cheapest first, two fallbacks behind it.' },
  { id: 'gemini-local', chain: ['gemini', 'local'], label: 'Google, then local', hint: 'Skips the rented GPUs entirely for stills.' },
  { id: 'gemini', chain: ['gemini'], label: 'Google only', hint: 'For debugging: image renders fail here instead of falling through to Flux.' },
  { id: 'runpod-local', chain: ['runpod', 'local'], label: 'GPU cloud, then local (Flux)', hint: 'The old path. Use when comparing Google against Flux output.' },
  { id: 'local', chain: ['local'], label: 'Local only (Flux)', hint: 'The reference box, for judging quality against.' },
]

function idOf(chain: RenderBackend[]): string {
  return chain.join('-')
}

function ChainPicker({
  title,
  chain,
  presets,
  onPick,
  disabled,
}: {
  title: string
  chain: RenderBackend[]
  presets: Preset[]
  onPick: (chain: RenderBackend[]) => void
  disabled: boolean
}) {
  const current = idOf(chain)
  return (
    <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5">
      <h3 className="font-heading font-semibold text-sm mb-1">{title}</h3>
      <p className="text-brand-400 text-xs font-body mb-4">
        Tried left to right. A backend is skipped only when it cannot run the job at all — a broken
        workflow fails everywhere and stops here.
      </p>
      <div className="space-y-2">
        {presets.map((p) => {
          const active = current === p.id
          return (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => onPick(p.chain)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 ${
                active
                  ? 'bg-violet-500/10 border-violet-400/40'
                  : 'bg-brand-950/40 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full border shrink-0 ${
                    active ? 'bg-violet-400 border-violet-400' : 'border-brand-500'
                  }`}
                />
                <span className={`font-heading font-semibold text-xs ${active ? 'text-white' : 'text-brand-300'}`}>
                  {p.label}
                </span>
                {p.chain.length === 1 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-heading font-bold tracking-wider">
                    NO FALLBACK
                  </span>
                )}
              </div>
              <p className="text-brand-400 text-[11px] font-body mt-1 ml-5">{p.hint}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminRenderSettings() {
  const [settings, setSettings] = useState<RenderSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = () => {
    adminGetRenderSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load render settings'))
  }

  useEffect(load, [])

  const save = async (kind: 'image' | 'video', chain: RenderBackend[]) => {
    if (!settings) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const chains = await adminSetRenderChains({ [kind]: chain })
      setSettings({ ...settings, chains })
      setNotice(`${kind === 'video' ? 'Video' : 'Image'} renders now use ${chain.map((b) => BACKEND_LABEL[b]).join(' → ')}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (error && !settings) {
    return <p className="text-red-400 text-xs font-body">{error}</p>
  }
  if (!settings) {
    return <p className="text-brand-400 text-xs font-body">Loading render settings…</p>
  }

  const { comfy } = settings
  const workers = comfy.workers

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg">
          <p className="text-red-400 text-xs font-body">{error}</p>
        </div>
      )}
      {notice && (
        <div className="px-4 py-3 bg-green-500/5 border border-green-500/15 rounded-lg">
          <p className="text-green-400 text-xs font-body">{notice}</p>
        </div>
      )}

      {/* Live state of the primary backend, so a pinned chain can be read against reality. */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="font-heading font-semibold text-sm">Generation pipeline</h3>
          <button
            onClick={load}
            className="text-brand-400 hover:text-brand-200 text-[11px] font-heading transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-body">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${comfy.reachable ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-brand-300">{comfy.reachable ? 'Reachable' : 'Unreachable'}</span>
          </span>
          <span className="text-brand-400">
            Driver <span className="text-brand-200">{comfy.driver}</span>
          </span>
          {workers && (
            <span className="text-brand-400">
              Workers{' '}
              <span className="text-brand-200">
                {workers.idle} idle · {workers.running} running · {workers.initializing} starting
              </span>
              {workers.unhealthy > 0 && <span className="text-red-400"> · {workers.unhealthy} unhealthy</span>}
            </span>
          )}
          {comfy.gpu && <span className="text-brand-400">GPU <span className="text-brand-200">{comfy.gpu.name}</span></span>}
        </div>
        {comfy.error && <p className="text-red-400 text-[11px] font-body mt-2">{comfy.error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChainPicker
          title="Video renders"
          chain={settings.chains.video}
          presets={VIDEO_PRESETS}
          onPick={(c) => save('video', c)}
          disabled={saving}
        />
        <ChainPicker
          title="Image renders"
          chain={settings.chains.image}
          presets={IMAGE_PRESETS}
          onPick={(c) => save('image', c)}
          disabled={saving}
        />
      </div>

      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-sm mb-3">What the backends are</h3>
        <dl className="space-y-2">
          {settings.backends.map((b) => (
            <div key={b} className="flex gap-3">
              <dt className="font-heading font-semibold text-xs text-brand-200 w-40 shrink-0">{BACKEND_LABEL[b]}</dt>
              <dd className="text-brand-400 text-xs font-body">{BACKEND_NOTE[b]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-brand-500 text-[11px] font-body mt-4 pt-4 border-t border-white/5">
          Changes apply to the next render — no redeploy. The environment default is{' '}
          <span className="text-brand-300">{settings.env_default.map((b) => BACKEND_LABEL[b]).join(' → ')}</span>, used
          only if this setting is ever unreadable.
        </p>
      </div>
    </div>
  )
}
