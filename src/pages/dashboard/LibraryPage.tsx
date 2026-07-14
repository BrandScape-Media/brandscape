import { useMemo, useState } from 'react'
import { useAgency, useAssets, useClientAssets, useClients } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { uploadClientAsset, deleteClientAsset } from '../../lib/api'
import { timeAgo, formatBytes } from '../../lib/format'
import { plans } from '../../data/plans'
import { ConfirmDialog } from './ClientsPage'
import type { ClientAsset, ClientAssetKind } from '../../types'

type MediaType = 'all' | 'image' | 'video' | 'audio'
type LibraryTab = 'generated' | 'uploads'

const KIND_LABELS: Record<ClientAssetKind, string> = {
  logo: 'Logo',
  product_image: 'Product Image',
  font: 'Font',
  reference: 'Reference',
  other: 'Other',
}

export default function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('generated')

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl">Media Library</h1>
          <p className="text-brand-500 text-sm font-body mt-1">
            Generated content and uploaded brand assets, per client.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-brand-900/30 rounded-xl p-1 border border-white/5 self-start">
          {(['generated', 'uploads'] as LibraryTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-xs font-heading tracking-wide transition-all duration-200 ${
                tab === t ? 'bg-white text-black font-bold' : 'text-brand-500 hover:text-white'
              }`}
            >
              {t === 'generated' ? 'Generated' : 'Uploads'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'generated' ? <GeneratedTab /> : <UploadsTab />}
    </div>
  )
}

function UploadsTab() {
  const { user, demoMode } = useAuth()
  const { data: assets, loading, error, reload } = useClientAssets()
  const { data: clients } = useClients()
  const { data: agency } = useAgency()
  const [clientFilter, setClientFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<'all' | ClientAssetKind>('all')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleting, setDeleting] = useState<ClientAsset | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const plan = plans.find((p) => p.tier === agency?.plan) ?? plans[0]
  const limitBytes = plan.storageGb * 1_000_000_000
  const usedBytes = useMemo(() => (assets ?? []).reduce((sum, a) => sum + (a.file_size ?? 0), 0), [assets])
  const usedPct = Math.min(100, Math.round((usedBytes / limitBytes) * 100))
  const overQuota = usedBytes >= limitBytes

  const filtered = useMemo(() => {
    return (assets ?? []).filter((a) => {
      if (clientFilter !== 'all' && a.client_id !== clientFilter) return false
      if (kindFilter !== 'all' && a.kind !== kindFilter) return false
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [assets, clientFilter, kindFilter, search])

  const handleDelete = async () => {
    if (!deleting) return
    if (demoMode) {
      setNotice('Demo mode is read-only.')
      setDeleting(null)
      return
    }
    try {
      await deleteClientAsset(deleting)
      setDeleting(null)
      reload()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not delete the asset.')
      setDeleting(null)
    }
  }

  return (
    <div>
      {notice && (
        <div className="mb-4 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-amber-400 text-xs font-body">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-amber-500/60 hover:text-amber-400 text-xs font-heading">✕</button>
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg">
          <p className="text-red-400 text-xs font-body">Could not load uploads: {error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-4 py-2.5 bg-brand-900/30 border border-white/5 rounded-xl text-white font-body text-sm focus:outline-none focus:border-white/20 transition-colors"
        >
          <option value="all">All clients</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as 'all' | ClientAssetKind)}
          className="px-4 py-2.5 bg-brand-900/30 border border-white/5 rounded-xl text-white font-body text-sm focus:outline-none focus:border-white/20 transition-colors"
        >
          <option value="all">All types</option>
          {(Object.keys(KIND_LABELS) as ClientAssetKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>

        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search uploads..."
            className="w-full pl-10 pr-4 py-2.5 bg-brand-900/30 border border-white/5 rounded-xl text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <div className="flex-1" />

        {/* Storage quota */}
        <div className="w-full sm:w-48">
          <div className="flex items-center justify-between mb-1">
            <span className="text-brand-600 text-[10px] font-heading tracking-wider">STORAGE</span>
            <span className={`text-[10px] font-heading ${overQuota ? 'text-red-400' : usedPct > 80 ? 'text-amber-500' : 'text-brand-500'}`}>
              {formatBytes(usedBytes)} / {plan.storageGb} GB
            </span>
          </div>
          <div className="h-1.5 bg-brand-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${overQuota ? 'bg-red-500' : usedPct > 80 ? 'bg-amber-500' : 'bg-white/60'}`} style={{ width: `${usedPct}%` }} />
          </div>
        </div>

        <button
          onClick={() => setUploadOpen(true)}
          disabled={overQuota}
          title={overQuota ? 'Storage quota reached — upgrade your plan or delete files' : undefined}
          className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          + UPLOAD
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-brand-900/20 border border-white/5 rounded-xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-brand-900/20 border border-white/5 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-900/50 border border-white/5 flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-brand-400 font-heading text-sm mb-1">
            {(assets?.length ?? 0) === 0 ? 'No uploads yet' : 'No uploads match your filters'}
          </p>
          <p className="text-brand-700 font-body text-xs mb-6">
            Upload brand logos, product images, fonts, and reference material per client.
          </p>
          <button
            onClick={() => setUploadOpen(true)}
            className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
          >
            + UPLOAD
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset) => {
            const isImage = asset.mime_type?.startsWith('image/')
            return (
              <div
                key={asset.id}
                className="bg-brand-900/20 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300 group"
              >
                <div className="aspect-square bg-brand-900/40 flex items-center justify-center relative overflow-hidden">
                  {isImage && asset.signed_url ? (
                    <img src={asset.signed_url} alt={asset.name} className="absolute inset-0 w-full h-full object-contain p-3" />
                  ) : (
                    <FileGlyph mime={asset.mime_type} kind={asset.kind} />
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-brand-950/0 group-hover:bg-brand-950/50 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {asset.signed_url && (
                      <a
                        href={asset.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        download={asset.name}
                        className="px-3.5 py-2 bg-white text-black font-heading font-bold text-[10px] tracking-wide rounded-lg"
                      >
                        DOWNLOAD
                      </a>
                    )}
                    <button
                      onClick={() => setDeleting(asset)}
                      className="px-3.5 py-2 bg-red-500/90 text-white font-heading font-bold text-[10px] tracking-wide rounded-lg hover:bg-red-500"
                    >
                      DELETE
                    </button>
                  </div>

                  <span className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md text-[9px] font-heading font-bold tracking-wider bg-white/[0.07] text-brand-300 border border-white/5">
                    {KIND_LABELS[asset.kind]}
                  </span>
                </div>

                <div className="p-3.5">
                  <h3 className="font-heading font-semibold text-xs text-white truncate" title={asset.name}>{asset.name}</h3>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-brand-600 text-[11px] font-body truncate max-w-[55%]">{asset.client_name ?? '—'}</span>
                    <span className="text-brand-700 text-[10px] font-heading">{formatBytes(asset.file_size)}</span>
                  </div>
                  <p className="text-brand-700 text-[10px] font-body mt-1">{timeAgo(asset.created_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          clients={clients ?? []}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { setUploadOpen(false); reload() }}
          demoMode={demoMode}
          agencyId={user?.agency_id}
          remainingBytes={Math.max(0, limitBytes - usedBytes)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="This removes the file from storage permanently."
          confirmLabel="Delete File"
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function FileGlyph({ mime, kind }: { mime?: string | null; kind: ClientAssetKind }) {
  const label = mime?.split('/')[1]?.toUpperCase().slice(0, 4) ?? kind.toUpperCase().slice(0, 4)
  return (
    <div className="flex flex-col items-center gap-2">
      <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span className="text-brand-600 text-[10px] font-heading tracking-wider">{label}</span>
    </div>
  )
}

function UploadModal({ clients, onClose, onUploaded, demoMode, agencyId, remainingBytes }: {
  clients: { id: string; name: string }[]
  onClose: () => void
  onUploaded: () => void
  demoMode: boolean
  agencyId?: string
  remainingBytes: number
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [kind, setKind] = useState<ClientAssetKind>('product_image')
  const [files, setFiles] = useState<FileList | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedBytes = files ? [...files].reduce((s, f) => s + f.size, 0) : 0

  const handleUpload = async () => {
    if (demoMode) {
      setError('Demo mode is read-only — sign in with a real account to upload.')
      return
    }
    if (!clientId || !files?.length || !agencyId) return
    if (selectedBytes > remainingBytes) {
      setError(`These files (${formatBytes(selectedBytes)}) exceed your remaining storage (${formatBytes(remainingBytes)}). Upgrade your plan or delete files.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`)
        await uploadClientAsset(agencyId, clientId, kind, files[i])
      }
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-md bg-brand-950 border border-white/10 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading font-bold text-lg mb-5">Upload Brand Assets</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors"
            >
              {clients.length === 0 && <option value="">No clients yet</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Asset Type</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ClientAssetKind)}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors"
            >
              {(Object.keys(KIND_LABELS) as ClientAssetKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Files * <span className="text-brand-700">(max 50 MB each)</span></label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-sm text-brand-400 font-body file:mr-4 file:px-4 file:py-2.5 file:rounded-lg file:border-0 file:bg-white file:text-black file:font-heading file:font-bold file:text-xs file:cursor-pointer file:hover:bg-brand-200 cursor-pointer"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs font-body bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="px-5 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={busy || !clientId || !files?.length}
              className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {busy ? progress || 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GeneratedTab() {
  const [filter, setFilter] = useState<MediaType>('all')
  const [search, setSearch] = useState('')
  const { data: assets, loading, error } = useAssets()

  const all = assets ?? []
  const filtered = all.filter((a) => {
    if (filter !== 'all' && a.type !== filter) return false
    const name = a.metadata?.name ?? ''
    const project = a.project_name ?? ''
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !project.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const typeConfig: Record<string, { icon: string; bg: string; bgGen: string }> = {
    image: {
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      bg: 'bg-gradient-to-br from-blue-600/10 to-purple-600/10',
      bgGen: 'bg-gradient-to-br from-blue-600/20 to-purple-600/20',
    },
    video: {
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      bg: 'bg-gradient-to-br from-red-600/10 to-orange-600/10',
      bgGen: 'bg-gradient-to-br from-red-600/20 to-orange-600/20',
    },
    audio: {
      icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
      bg: 'bg-gradient-to-br from-green-600/10 to-emerald-600/10',
      bgGen: 'bg-gradient-to-br from-green-600/20 to-emerald-600/20',
    },
  }

  return (
    <div>
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg">
          <p className="text-red-400 text-xs font-body">Could not load assets: {error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Filters */}
        <div className="flex items-center gap-1 bg-brand-900/30 rounded-xl p-1 border border-white/5">
          {(['all', 'image', 'video', 'audio'] as MediaType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-xs font-heading tracking-wide transition-all duration-200 ${
                filter === type
                  ? 'bg-white text-black font-bold'
                  : 'text-brand-500 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All Assets' : type === 'image' ? 'Images' : type === 'video' ? 'Videos' : 'Audio'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-10 pr-4 py-2.5 bg-brand-900/30 border border-white/5 rounded-xl text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-brand-900/20 border border-white/5 rounded-xl aspect-[4/3] animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((asset) => {
            const config = typeConfig[asset.type]
            const name = asset.metadata?.name ?? `${asset.type} asset`
            return (
              <div
                key={asset.id}
                className="bg-brand-900/20 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300 group"
              >
                {/* Preview Area */}
                <div className={`aspect-video ${config.bg} flex items-center justify-center relative`}>
                  {asset.thumbnail_url ? (
                    <img src={asset.thumbnail_url} alt={name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-white/10 group-hover:text-white/20 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={config.icon} />
                    </svg>
                  )}

                  {asset.status === 'generating' && (
                    <div className="absolute inset-0 bg-brand-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span className="text-brand-300 text-xs font-heading tracking-wide">GENERATING</span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  {asset.status === 'completed' && asset.url && asset.url !== '#' && (
                    <div className="absolute inset-0 bg-brand-950/0 group-hover:bg-brand-950/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="px-5 py-2.5 bg-white text-black font-heading font-bold text-xs tracking-wide rounded-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                      >
                        DOWNLOAD
                      </a>
                    </div>
                  )}

                  {/* Type Badge */}
                  {asset.metadata?.format && (
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-heading font-bold tracking-wider ${config.bgGen} text-white/60 border border-white/5`}>
                        {asset.metadata.format}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-sm text-white truncate group-hover:text-brand-200 transition-colors">
                    {name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-brand-600 text-xs font-body truncate max-w-[60%]">{asset.project_name ?? '—'}</span>
                    {asset.metadata?.size && <span className="text-brand-700 text-[10px] font-heading">{asset.metadata.size}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03]">
                    <span className={`text-[10px] font-heading tracking-wider flex items-center gap-1.5 ${
                      asset.status === 'completed' ? 'text-green-500/80' : asset.status === 'failed' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        asset.status === 'completed' ? 'bg-green-500' : asset.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
                      }`} />
                      {asset.status === 'completed' ? 'READY' : asset.status === 'failed' ? 'FAILED' : 'GENERATING'}
                    </span>
                    <span className="text-brand-700 text-[10px] font-body">{timeAgo(asset.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-900/50 border border-white/5 flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-brand-400 font-heading text-sm mb-1">
            {all.length === 0 ? 'No assets yet' : 'No assets found'}
          </p>
          <p className="text-brand-700 font-body text-xs">
            {all.length === 0
              ? 'Generated images, videos, and audio will land here once the Shooting stage runs.'
              : 'Try adjusting your filters or search query'}
          </p>
        </div>
      )}
    </div>
  )
}
