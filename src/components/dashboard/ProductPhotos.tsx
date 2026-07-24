import { useCallback, useEffect, useState } from 'react'
import { listClientAssets, uploadClientAsset, deleteClientAsset } from '../../lib/api'
import {
  adminListProductPhotos,
  adminUploadProductPhoto,
  adminDeleteProductPhoto,
} from '../../lib/orchestrator'
import { formatBytes } from '../../lib/format'

/**
 * The client's product photos, managed from inside a project. Product shots
 * live on the CLIENT (client_assets, kind='product_image') and the shoot
 * renders from them, so a project created without one used to be stuck —
 * this panel adds/removes them after the fact.
 *
 * 'agency' talks to Supabase under RLS; 'admin' goes through the
 * orchestrator so staff can fix any agency's project.
 */

type Photo = { id: string; name: string; url: string | null; size: number | null }

export default function ProductPhotos({
  mode,
  projectId,
  agencyId,
  clientId,
  demo = false,
  compact = false,
}: {
  mode: 'agency' | 'admin'
  projectId: string
  /** agency mode only — where the upload is billed/stored */
  agencyId?: string | null
  /** agency mode only — which client's library receives the photo */
  clientId?: string | null
  demo?: boolean
  /** tighter spacing for the admin panel */
  compact?: boolean
}) {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (demo) {
      setPhotos([])
      return
    }
    try {
      if (mode === 'admin') {
        const res = await adminListProductPhotos(projectId)
        setPhotos(res.photos.map((p) => ({ id: p.id, name: p.name, url: p.view_url, size: p.file_size })))
      } else {
        const all = await listClientAssets()
        setPhotos(
          all
            .filter((a) => a.kind === 'product_image' && a.client_id === clientId)
            .map((a) => ({ id: a.id, name: a.name, url: a.signed_url ?? null, size: a.file_size ?? null })),
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load product photos.')
      setPhotos([])
    }
  }, [mode, projectId, clientId, demo])

  useEffect(() => {
    void load()
  }, [load])

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    if (demo) {
      setError('Demo mode is read-only — sign in to upload product photos.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        if (mode === 'admin') {
          await adminUploadProductPhoto(projectId, file)
        } else {
          if (!agencyId || !clientId) throw new Error('Missing client — reload the project and try again.')
          await uploadClientAsset(agencyId, clientId, 'product_image', file)
        }
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (photo: Photo) => {
    if (demo) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'admin') {
        await adminDeleteProductPhoto(photo.id)
      } else {
        const all = await listClientAssets()
        const full = all.find((a) => a.id === photo.id)
        if (full) await deleteClientAsset(full)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that photo.')
    } finally {
      setBusy(false)
    }
  }

  const empty = photos !== null && photos.length === 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="block text-xs font-heading text-brand-500">
          Product Photos <span className="text-brand-700">— the shoot renders from these</span>
        </label>
        <label
          className={`px-3 py-1.5 rounded-lg border border-white/10 text-brand-300 hover:text-white hover:border-white/25 font-heading text-[11px] transition-all ${
            busy ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
          }`}
        >
          {busy ? 'Working…' : '+ Add photo'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {photos === null ? (
        <div className={`grid grid-cols-4 gap-2 ${compact ? '' : 'sm:grid-cols-5'}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : empty ? (
        <div className="border border-dashed border-amber-500/25 bg-amber-500/[0.04] rounded-xl px-4 py-4 text-center">
          <p className="text-amber-400 text-xs font-heading">No product photo on this client yet</p>
          <p className="text-brand-500 text-[11px] font-body mt-1">
            Product and influencer-holding-product shots can&apos;t render without one — the shoot will stop and ask.
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-4 gap-2 ${compact ? '' : 'sm:grid-cols-5'}`}>
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden border border-white/10 bg-brand-900">
              {p.url ? (
                <img src={p.url} alt={p.name} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-brand-700 text-[10px] font-heading">
                  NO PREVIEW
                </div>
              )}
              <button
                type="button"
                onClick={() => void remove(p)}
                title={`Remove ${p.name}`}
                className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-red-500/90 text-white text-[9px] font-heading font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <p className="px-1.5 py-1 text-brand-500 text-[9px] font-body truncate" title={p.name}>
                {p.name}
                {p.size ? ` · ${formatBytes(p.size)}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-[11px] font-body mt-2">{error}</p>}
      <p className="text-brand-700 text-[11px] font-body mt-2">
        One clean photo per product. They save to this client&apos;s library (Media Library → Uploads), so every
        campaign for the brand reuses them.
      </p>
    </div>
  )
}
