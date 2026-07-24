import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listProjectAssets } from '../../lib/api'
import { generateRaws, regenerateShot, regenerateVo, type RawsPhase } from '../../lib/orchestrator'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase/client'
import type { Job, MediaAsset } from '../../types'

type Tab = 'images' | 'audio' | 'video'
const TABS: { key: Tab; label: string; type: MediaAsset['type']; phase: RawsPhase }[] = [
  { key: 'images', label: 'Images', type: 'image', phase: 'images' },
  { key: 'audio', label: 'Audio', type: 'audio', phase: 'audio' },
  { key: 'video', label: 'Video', type: 'video', phase: 'video' },
]

/** Latest asset per group (assets arrive newest-first), then ordered by key. */
function latestByKey(assets: MediaAsset[], keyOf: (a: MediaAsset) => string) {
  const seen = new Map<string, MediaAsset>()
  for (const a of assets) {
    const k = keyOf(a)
    if (!seen.has(k)) seen.set(k, a)
  }
  return [...seen.values()].sort((x, y) => keyOf(x).localeCompare(keyOf(y)))
}

/**
 * The Raws production workspace: Images / Audio / Video tabs over the
 * project's generated media. Each asset is a card that can be regenerated on
 * its own; each tab has a "Generate all". Audio cards let you edit a VO line's
 * wording and re-synthesize. Reflects live status from the media_assets feed
 * (per card) and the shoot_run job (per "generate all").
 */
export default function RawsWorkspace({
  projectId,
  shootplanDone,
  job,
}: {
  projectId: string
  shootplanDone: boolean
  job?: Job | null
}) {
  const { demoMode } = useAuth()
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [tab, setTab] = useState<Tab>('images')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null) // asset/phase key currently acted on
  const [voEdits, setVoEdits] = useState<Record<string, string>>({})

  const reload = useCallback(() => {
    if (demoMode || !isSupabaseConfigured()) return
    listProjectAssets(projectId).then(setAssets).catch(() => undefined)
  }, [demoMode, projectId])

  useEffect(() => { reload() }, [reload])

  // live: refresh when this project's media changes (generating → completed)
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  useEffect(() => {
    if (demoMode || !isSupabaseConfigured()) return
    const channel = getSupabase()
      .channel(`raws-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_assets', filter: `project_id=eq.${projectId}` }, () => reloadRef.current())
      .subscribe()
    return () => { getSupabase().removeChannel(channel) }
  }, [demoMode, projectId])

  // the shoot_run job also lands new assets — refresh when it moves
  useEffect(() => { if (job?.status) reload() }, [job?.status, reload])

  // Raws assets only (exclude Deliverables), grouped by type
  const raws = useMemo(() => assets.filter((a) => a.metadata?.source !== 'deliverable'), [assets])
  const groups = useMemo(() => ({
    images: latestByKey(raws.filter((a) => a.type === 'image'), (a) => a.metadata?.shot_id ?? a.id),
    audio: latestByKey(raws.filter((a) => a.type === 'audio'), (a) => a.metadata?.vo ?? a.id),
    video: latestByKey(raws.filter((a) => a.type === 'video'), (a) => a.metadata?.shot_id ?? a.id),
  }), [raws])

  const act = async (key: string, fn: () => Promise<void>) => {
    if (demoMode) { setError('Demo mode is read-only — sign in to generate.'); return }
    setBusy(key)
    setError(null)
    try { await fn(); reload() } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.') } finally { setBusy(null) }
  }

  if (!shootplanDone) {
    return (
      <span className="text-brand-600 text-xs font-body">
        Complete and approve the Shoot Plan first — Raws are generated from it.
      </span>
    )
  }

  const phaseRunning = job?.status === 'queued' || job?.status === 'running'

  return (
    <div className="w-full">
      {/* Tabs + generate-all */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-brand-900/40 border border-white/5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-heading tracking-wide transition-all ${
                tab === t.key ? 'bg-white text-black font-bold' : 'text-brand-400 hover:text-white'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 ${tab === t.key ? 'text-black/50' : 'text-brand-600'}`}>{groups[t.key].length}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => act(`all`, () => generateRaws(projectId, 'all'))}
            disabled={!!busy || phaseRunning}
            className="px-3.5 py-2 border border-white/15 text-white font-heading font-bold text-[11px] tracking-wide rounded-lg hover:border-white/30 transition-colors disabled:opacity-40"
          >
            Generate Everything
          </button>
          <button
            onClick={() => act(`phase-${tab}`, () => generateRaws(projectId, TABS.find((t) => t.key === tab)!.phase))}
            disabled={!!busy || phaseRunning}
            className="ai-glow px-4 py-2 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40"
          >
            Generate all {TABS.find((t) => t.key === tab)!.label}
          </button>
        </div>
      </div>

      {/* Live phase-job status */}
      {phaseRunning && (
        <div className="mb-4 px-4 py-2.5 bg-blue-500/[0.06] border border-blue-500/15 rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <span className="text-blue-300 text-xs font-body">Generating{job?.payload?.phase ? ` ${job.payload.phase}` : ''} — cards update as each item finishes.</span>
        </div>
      )}
      {job?.status === 'failed' && (
        <div className="mb-4 px-4 py-2.5 bg-red-500/[0.06] border border-red-500/15 rounded-lg">
          <span className="text-red-300 text-xs font-body">{job.error ?? 'The last generation failed.'}</span>
        </div>
      )}
      {error && <p className="text-red-400 text-xs font-body mb-3">{error}</p>}

      {/* Tab body */}
      {tab === 'audio'
        ? <AudioGrid assets={groups.audio} busy={busy} voEdits={voEdits} setVoEdits={setVoEdits}
            onRegen={(voId, text) => act(`vo-${voId}`, () => regenerateVo(projectId, voId, text))} />
        : <MediaGrid tab={tab} assets={groups[tab]} busy={busy}
            onRegen={(shotId) => act(`shot-${shotId}`, () => regenerateShot(projectId, shotId))} />}
    </div>
  )
}

function StatusBadge({ status }: { status: MediaAsset['status'] }) {
  if (status === 'completed') return null
  if (status === 'failed') return <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-red-500/80 text-white text-[9px] font-heading font-bold">FAILED</span>
  return (
    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-blue-500/80 text-white text-[9px] font-heading font-bold flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> GENERATING
    </span>
  )
}

function MediaGrid({ tab, assets, busy, onRegen }: {
  tab: 'images' | 'video'
  assets: MediaAsset[]
  busy: string | null
  onRegen: (shotId: string) => void
}) {
  if (assets.length === 0) {
    return <p className="text-brand-600 text-xs font-body py-6 text-center">No {tab} yet — use “Generate all {tab === 'images' ? 'Images' : 'Video'}”.</p>
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {assets.map((a) => {
        const shotId = a.metadata?.shot_id ?? ''
        const label = a.metadata?.name ?? shotId
        const regenning = busy === `shot-${shotId}` || a.status === 'generating'
        return (
          <div key={a.id} className="rounded-xl border border-white/10 bg-brand-900/30 overflow-hidden group">
            <div className="relative aspect-[3/4] bg-brand-950 flex items-center justify-center">
              <StatusBadge status={a.status} />
              {a.status === 'completed' && a.url && (
                tab === 'video'
                  ? <video src={a.url} controls className="w-full h-full object-cover" />
                  : <img src={a.thumbnail_url || a.url} alt={label} className="w-full h-full object-cover" />
              )}
              {a.status === 'failed' && <span className="text-red-400/70 text-[10px] font-body px-3 text-center">{a.metadata?.error ?? 'generation failed'}</span>}
            </div>
            <div className="p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white text-[11px] font-heading truncate">{label}</p>
                {a.metadata?.workflow && <p className="text-brand-600 text-[10px] font-body">{a.metadata.workflow}</p>}
              </div>
              {shotId && (
                <button
                  onClick={() => onRegen(shotId)}
                  disabled={regenning}
                  className="shrink-0 px-2 py-1 rounded-md border border-white/15 text-brand-300 hover:text-white hover:border-white/30 text-[10px] font-heading transition-colors disabled:opacity-40"
                >
                  {regenning ? '…' : 'Regenerate'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AudioGrid({ assets, busy, voEdits, setVoEdits, onRegen }: {
  assets: MediaAsset[]
  busy: string | null
  voEdits: Record<string, string>
  setVoEdits: Dispatch<SetStateAction<Record<string, string>>>
  onRegen: (voId: string, text?: string) => void
}) {
  if (assets.length === 0) {
    return <p className="text-brand-600 text-xs font-body py-6 text-center">No voiceovers yet — use “Generate all Audio”. (They also auto-generate when the Shoot Plan lands.)</p>
  }
  return (
    <div className="space-y-3">
      {assets.map((a) => {
        const voId = a.metadata?.vo ?? ''
        const original = a.metadata?.text ?? ''
        const edited = voEdits[voId] ?? original
        const dirty = edited.trim() !== original.trim()
        const regenning = busy === `vo-${voId}` || a.status === 'generating'
        return (
          <div key={a.id} className="rounded-xl border border-white/10 bg-brand-900/30 p-3.5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px] font-heading font-bold">{voId || 'VO'}</span>
                {a.metadata?.voice_name && <span className="text-brand-600 text-[10px] font-body">🎙 {a.metadata.voice_name}</span>}
                {a.status === 'generating' && <span className="text-blue-300 text-[10px] font-body flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> generating</span>}
                {a.status === 'failed' && <span className="text-red-400 text-[10px] font-body">failed</span>}
              </div>
              <button
                onClick={() => onRegen(voId, dirty ? edited : undefined)}
                disabled={regenning || !voId}
                className="shrink-0 px-2.5 py-1 rounded-md border border-white/15 text-brand-300 hover:text-white hover:border-white/30 text-[10px] font-heading transition-colors disabled:opacity-40"
              >
                {regenning ? 'Generating…' : dirty ? 'Save & Regenerate' : 'Regenerate'}
              </button>
            </div>
            {a.status === 'completed' && a.url && <audio src={a.url} controls className="w-full h-9 mb-2" />}
            <textarea
              value={edited}
              onChange={(e) => setVoEdits((m) => ({ ...m, [voId]: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-brand-950 border border-white/10 rounded-lg text-white font-body text-xs leading-relaxed placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-y"
              placeholder="Voiceover line…"
            />
            {dirty && <p className="text-amber-400/80 text-[10px] font-body mt-1">Edited — “Save & Regenerate” to synthesize the new wording.</p>}
          </div>
        )
      })}
    </div>
  )
}
