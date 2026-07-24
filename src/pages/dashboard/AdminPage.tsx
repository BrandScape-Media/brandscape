import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  adminListProjects,
  adminGetProject,
  adminOverrideStage,
  adminUploadMedia,
  adminDeleteMedia,
  adminDeleteProject,
  adminGetShootPlan,
  type AdminProjectSummary,
  type AdminProjectDetail,
  type AdminShootPlan,
} from '../../lib/orchestrator'
import { timeAgo, formatBytes } from '../../lib/format'
import DiscoveryEditor from '../../components/dashboard/DiscoveryEditor'
import AdminPlayground from './AdminPlayground'
import AdminInfluencers from './AdminInfluencers'
import AdminMediaLab from './AdminMediaLab'

/**
 * Platform-admin mission control (Brandscape staff only): human QC across
 * every agency. Override any stage's status or output ("act as the AI"),
 * upload curated media into a project's library as generated assets, and
 * remove anything that shouldn't ship.
 */

const STAGE_STATUSES = ['pending', 'in_progress', 'completed', 'revision'] as const

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500/15 text-green-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  revision: 'bg-amber-500/15 text-amber-400',
  pending: 'bg-brand-800 text-brand-500',
}

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'projects' | 'influencers' | 'medialab' | 'playground'>('projects')
  const [projects, setProjects] = useState<AdminProjectSummary[] | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminProjectDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!user?.platform_admin) return
    adminListProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load projects'))
  }, [user?.platform_admin])

  const loadDetail = async (id: string) => {
    setSelectedId(id)
    setDetailLoading(true)
    setConfirmDelete(false)
    setNotice(null)
    try {
      setDetail(await adminGetProject(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the project')
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (projects ?? []).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.agency_name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q),
    )
  }, [projects, search])

  if (!user?.platform_admin) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] text-center py-24">
        <p className="text-brand-400 font-heading text-sm">This area is for Brandscape staff.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="font-heading font-bold text-2xl">Mission Control</h1>
        <span className="px-2 py-1 rounded-md bg-purple-500/15 text-purple-300 text-[9px] font-heading font-bold tracking-wider">
          PLATFORM ADMIN
        </span>
      </div>
      <p className="text-brand-500 text-sm font-body mb-6">
        Human QC across all agencies — override stages, curate generated media, act as the AI.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-6 border-b border-white/5">
        {(
          [
            { id: 'projects', label: 'Projects & QC' },
            { id: 'influencers', label: 'Influencers' },
            { id: 'medialab', label: 'Media Lab' },
            { id: 'playground', label: 'AI Playground' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 font-heading font-semibold text-xs tracking-wide rounded-t-lg border-b-2 transition-colors ${
              tab === t.id
                ? 'text-white border-violet-400'
                : 'text-brand-500 border-transparent hover:text-brand-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-red-400 text-xs font-body">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500/60 hover:text-red-400 text-xs font-heading">✕</button>
        </div>
      )}
      {notice && (
        <div className="mb-4 px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-blue-300 text-xs font-body">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-blue-400/60 hover:text-blue-300 text-xs font-heading">✕</button>
        </div>
      )}

      {tab === 'playground' ? (
        <AdminPlayground />
      ) : tab === 'medialab' ? (
        <AdminMediaLab />
      ) : tab === 'influencers' ? (
        <AdminInfluencers />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project picker */}
        <div className="bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project, agency, client…"
              className="w-full px-3.5 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-xs placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {projects === null ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-5 text-brand-600 text-xs font-body">No projects match.</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadDetail(p.id)}
                  className={`w-full text-left px-4 py-3.5 border-b border-white/[0.03] transition-colors ${
                    selectedId === p.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading font-semibold text-xs text-white truncate">{p.name}</p>
                    {p.archived && (
                      <span className="px-1.5 py-0.5 rounded bg-brand-800 text-brand-500 text-[8px] font-heading font-bold tracking-wider flex-shrink-0">ARCHIVED</span>
                    )}
                  </div>
                  <p className="text-brand-600 text-[10px] font-body mt-0.5 truncate">
                    {p.agency_name} · {p.client_name} · {timeAgo(p.updated_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Project detail */}
        <div className="lg:col-span-2 space-y-5">
          {!selectedId ? (
            <div className="bg-brand-900/20 border border-white/5 rounded-xl p-16 text-center">
              <p className="text-brand-500 font-heading text-sm">Pick a project to inspect and control.</p>
            </div>
          ) : detailLoading || !detail ? (
            <div className="bg-brand-900/20 border border-white/5 rounded-xl h-64 animate-pulse" />
          ) : (
            <>
              <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading font-bold text-base text-white">{detail.name}</p>
                  <p className="text-brand-600 text-xs font-body mt-1">
                    {detail.agency_name} · {detail.client_name} · current stage: {detail.current_stage}
                  </p>
                </div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-red-400 text-[11px] font-body">Delete this project?</span>
                    <button
                      onClick={async () => {
                        try {
                          await adminDeleteProject(detail.id)
                          setConfirmDelete(false)
                          setSelectedId(null)
                          setDetail(null)
                          setNotice('Project deleted.')
                          adminListProjects().then(setProjects).catch(() => undefined)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Delete failed')
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-heading font-bold tracking-wide"
                    >
                      YES, DELETE
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg border border-white/15 text-brand-300 text-[10px] font-heading">CANCEL</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:border-red-500/60 text-[10px] font-heading font-bold tracking-wide transition-colors"
                  >
                    DELETE PROJECT
                  </button>
                )}
              </div>

              <StagesPanel detail={detail} onChanged={() => loadDetail(detail.id)} onNotice={setNotice} onError={setError} />
              <MachinePlanPanel projectId={detail.id} />
              <MediaPanel detail={detail} onChanged={() => loadDetail(detail.id)} onNotice={setNotice} onError={setError} />
            </>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

function StagesPanel({ detail, onChanged, onNotice, onError }: {
  detail: AdminProjectDetail
  onChanged: () => void
  onNotice: (m: string) => void
  onError: (m: string) => void
}) {
  const [editingStage, setEditingStage] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [discoveryOpen, setDiscoveryOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const setStatus = async (stage: string, status: string) => {
    setBusy(true)
    try {
      await adminOverrideStage(detail.id, stage, { status })
      onNotice(`${stage} → ${status.replace('_', ' ')}`)
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Override failed')
    } finally {
      setBusy(false)
    }
  }

  const saveText = async () => {
    if (editingStage === null) return
    setBusy(true)
    try {
      await adminOverrideStage(detail.id, editingStage, { text: editText })
      onNotice(`Rewrote the ${editingStage} output.`)
      setEditingStage(null)
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
      <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider mb-4">STAGE OVERRIDES</h3>
      <div className="space-y-2">
        {detail.stages.map((s) => (
          <div key={s.stage} className="px-4 py-3 bg-brand-900/30 border border-white/[0.03] rounded-lg">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-heading font-semibold text-xs text-white capitalize w-24">{s.stage}</span>
              <span className={`px-2 py-1 rounded text-[9px] font-heading font-bold tracking-wider ${STATUS_STYLES[s.status] ?? STATUS_STYLES.pending}`}>
                {s.status.replace('_', ' ').toUpperCase()}
              </span>
              <div className="flex-1" />
              <select
                value={s.status}
                disabled={busy}
                onChange={(e) => setStatus(s.stage, e.target.value)}
                className="px-2.5 py-1.5 bg-brand-900 border border-white/10 rounded-lg text-brand-300 font-body text-[11px] focus:outline-none focus:border-white/30 transition-colors"
              >
                {STAGE_STATUSES.map((st) => (
                  <option key={st} value={st}>{st.replace('_', ' ')}</option>
                ))}
              </select>
              {s.stage === 'discovery' ? (
                <button
                  onClick={() => setDiscoveryOpen(true)}
                  className="px-3 py-1.5 border border-white/10 text-brand-300 hover:text-white hover:border-white/25 font-heading text-[11px] rounded-lg transition-all"
                >
                  Edit Brief
                </button>
              ) : s.stage === 'shooting' ? (
                <span className="text-brand-700 text-[10px] font-body">media pipeline</span>
              ) : (
                <button
                  onClick={() => {
                    setEditingStage(editingStage === s.stage ? null : s.stage)
                    setEditText(s.content?.text ?? '')
                  }}
                  className="px-3 py-1.5 border border-white/10 text-brand-300 hover:text-white hover:border-white/25 font-heading text-[11px] rounded-lg transition-all"
                >
                  {editingStage === s.stage ? 'Close' : 'Edit Output'}
                </button>
              )}
            </div>
            {editingStage === s.stage && (
              <div className="mt-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={8}
                  placeholder="Stage output (markdown supported)…"
                  className="w-full px-3.5 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-xs leading-relaxed placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-y"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={saveText}
                    disabled={busy}
                    className="px-4 py-2 bg-white text-black font-heading font-bold text-xs rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40"
                  >
                    {busy ? 'Saving…' : 'Save as AI Output'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {discoveryOpen && (
        <DiscoveryEditor
          projectId={detail.id}
          discovery={detail.discovery_data as never}
          mode="admin"
          onClose={() => setDiscoveryOpen(false)}
          onSaved={() => {
            onNotice('Discovery brief updated.')
            onChanged()
          }}
        />
      )}
    </div>
  )
}

/**
 * The shoot plan's MACHINE layer — the raw shots JSON the pipeline renders
 * from (cast, per-shot workflows, VO wiring, prompts). Redacted from
 * agencies by design; this is the staff QC window into it.
 */
function MachinePlanPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<AdminShootPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // fresh project selected → collapse and drop the stale plan
  useEffect(() => {
    setOpen(false)
    setData(null)
    setError(null)
  }, [projectId])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (!next || data || loading) return
    setLoading(true)
    setError(null)
    try {
      setData(await adminGetShootPlan(projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the machine plan.')
    } finally {
      setLoading(false)
    }
  }

  const shots = data?.plan?.shots ?? []
  const workflowStyles: Record<string, string> = {
    product: 'bg-sky-500/15 text-sky-300',
    composite: 'bg-violet-500/15 text-violet-300',
    broll: 'bg-amber-500/15 text-amber-300',
    talkinghead: 'bg-green-500/15 text-green-300',
    voiceover: 'bg-rose-500/15 text-rose-300',
  }

  return (
    <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
      <button onClick={toggle} className="w-full flex items-center justify-between group">
        <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">
          MACHINE PLAN <span className="text-brand-600 font-body normal-case tracking-normal">— what the shoot renders (never shown to agencies)</span>
        </h3>
        <span className="text-brand-500 group-hover:text-white text-xs transition-colors">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4">
          {loading && <p className="text-brand-500 text-xs font-body">Loading…</p>}
          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
          {!loading && !error && data && !data.plan && (
            <p className="text-brand-600 text-xs font-body">
              No machine plan yet — the Shoot Plan stage hasn&apos;t produced one for this project (run it, or re-run if it predates structured output).
            </p>
          )}
          {!loading && data?.plan && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-body">
                <span className="text-brand-400">
                  <span className="text-brand-600">Cast:</span>{' '}
                  {data.influencer
                    ? `${data.influencer.name} (${data.influencer.gender} · ${data.influencer.age_bracket}${data.influencer.voice_name ? ` · 🎙 ${data.influencer.voice_name}` : ''})`
                    : (data.plan.influencer_id ?? '—')}
                </span>
                {data.plan.cast_why && <span className="text-brand-600 italic">“{data.plan.cast_why}”</span>}
                <span className="text-brand-600">
                  VO blocks from Scripts: {data.vo_ids.length ? data.vo_ids.join(', ') : 'none'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-body">
                  <thead>
                    <tr className="text-brand-600 border-b border-white/5">
                      <th className="py-2 pr-3 font-heading font-semibold">Shot</th>
                      <th className="py-2 pr-3 font-heading font-semibold">Script</th>
                      <th className="py-2 pr-3 font-heading font-semibold">Workflow</th>
                      <th className="py-2 pr-3 font-heading font-semibold">Wiring</th>
                      <th className="py-2 font-heading font-semibold">Prompt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shots.map((s) => {
                      const wiring = [
                        s.product_ref ? `📷 ${s.product_ref}` : null,
                        s.start_frame ? `frame: ${s.start_frame}` : null,
                        s.vo ? `vo: ${s.vo}${data.vo_ids.includes(s.vo) ? '' : ' ⚠ missing'}` : null,
                        s.duration_s ? `${s.duration_s}s` : null,
                        s.language ?? null,
                      ].filter(Boolean).join(' · ')
                      return (
                        <tr key={s.id} className="border-b border-white/[0.03] align-top">
                          <td className="py-2 pr-3 text-white whitespace-nowrap">{s.id}</td>
                          <td className="py-2 pr-3 text-brand-400 whitespace-nowrap">{s.script ?? '—'}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-heading font-bold ${workflowStyles[s.workflow] ?? 'bg-white/10 text-brand-300'}`}>
                              {s.workflow}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-brand-500 whitespace-nowrap">{wiring || '—'}</td>
                          <td className="py-2 text-brand-400 max-w-[420px]">
                            <span className="line-clamp-2" title={s.prompt}>{s.prompt ?? '—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-brand-700 text-[10px] font-body">
                {shots.length} shots · {shots.filter((s) => s.workflow === 'talkinghead').length} talking-head · {shots.filter((s) => s.workflow === 'voiceover').length} standalone VO
                {data.updated_at ? ` · saved ${timeAgo(data.updated_at)}` : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MediaPanel({ detail, onChanged, onNotice, onError }: {
  detail: AdminProjectDetail
  onChanged: () => void
  onNotice: (m: string) => void
  onError: (m: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of [...files]) {
        const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image'
        await adminUploadMedia(detail.id, file, type)
      }
      onNotice(`${files.length} file${files.length > 1 ? 's' : ''} placed in the library as generated media.`)
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await adminDeleteMedia(id)
      onNotice('Asset removed.')
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">GENERATED MEDIA (ACT AS THE AI)</h3>
        <label className={`px-4 py-2 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg transition-colors cursor-pointer ${uploading ? 'opacity-40 pointer-events-none' : 'hover:bg-brand-200'}`}>
          {uploading ? 'Uploading…' : '+ Upload as AI'}
          <input type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>

      {detail.media.length === 0 ? (
        <p className="text-brand-600 text-xs font-body py-6 text-center">
          No media yet — upload files and they appear in this project's library as AI-generated assets.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {detail.media.map((m) => (
            <div key={m.id} className="bg-brand-900/40 border border-white/5 rounded-lg overflow-hidden group">
              <div className="aspect-video bg-brand-900/60 relative flex items-center justify-center">
                {m.view_url && m.type === 'image' ? (
                  <img src={m.view_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : m.view_url && m.type === 'video' ? (
                  <video src={m.view_url} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : (
                  <span className="text-brand-600 text-[10px] font-heading tracking-wider">{m.type.toUpperCase()}</span>
                )}
                <button
                  onClick={() => remove(m.id)}
                  className="absolute top-1.5 right-1.5 px-2 py-1 rounded bg-red-500/90 text-white text-[9px] font-heading font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  DELETE
                </button>
              </div>
              <div className="px-2.5 py-2">
                <p className="text-brand-300 text-[10px] font-body truncate">{m.metadata?.name ?? m.url.split('/').pop()}</p>
                <p className="text-brand-700 text-[9px] font-body mt-0.5">
                  {m.file_size ? formatBytes(m.file_size) : m.type} · {timeAgo(m.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
