import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  listMediaComments,
  addMediaComment,
  setMediaCommentResolved,
  deleteMediaComment,
} from '../../lib/api'
import { timeAgo, formatBytes, formatTimestamp } from '../../lib/format'
import type { MediaAsset, MediaComment } from '../../types'

/**
 * Full-screen review viewer for a generated asset: media on the left, an
 * info + comments sidebar on the right. Comments can be pinned to a video
 * frame (click the timestamp to seek there). In demo mode nothing hits the
 * database — comments live in local state so the flow is still previewable.
 */
export default function MediaViewer({
  asset,
  onClose,
}: {
  asset: MediaAsset
  onClose: () => void
}) {
  const { user, demoMode } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [comments, setComments] = useState<MediaComment[]>([])
  const [loading, setLoading] = useState(!demoMode)
  const [body, setBody] = useState('')
  const [pinTime, setPinTime] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (demoMode) {
      setComments([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    listMediaComments(asset.id)
      .then((rows) => alive && setComments(rows))
      .catch(() => alive && setError('Could not load comments.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [asset.id, demoMode])

  const pinCurrentTime = () => {
    const t = videoRef.current?.currentTime
    if (t != null) setPinTime(Math.floor(t))
  }

  const seekTo = (seconds: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = seconds
    v.play().catch(() => undefined)
  }

  const submit = async () => {
    const text = body.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    const ts = asset.type === 'video' ? pinTime : null
    try {
      if (demoMode) {
        setComments((c) => [
          ...c,
          {
            id: crypto.randomUUID(),
            asset_id: asset.id,
            author_name: user?.name ?? 'You',
            body: text,
            timestamp_seconds: ts,
            resolved: false,
            created_at: new Date().toISOString(),
          },
        ])
      } else {
        const saved = await addMediaComment({
          assetId: asset.id,
          authorId: user!.id,
          authorName: user?.name ?? 'Teammate',
          body: text,
          timestampSeconds: ts,
        })
        setComments((c) => [...c, saved])
      }
      setBody('')
      setPinTime(null)
    } catch {
      setError('Could not post your comment.')
    } finally {
      setBusy(false)
    }
  }

  const toggleResolved = async (c: MediaComment) => {
    setComments((list) => list.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)))
    if (!demoMode) {
      try {
        await setMediaCommentResolved(c.id, !c.resolved)
      } catch {
        setComments((list) => list.map((x) => (x.id === c.id ? { ...x, resolved: c.resolved } : x)))
      }
    }
  }

  const remove = async (c: MediaComment) => {
    setComments((list) => list.filter((x) => x.id !== c.id))
    if (!demoMode) {
      try {
        await deleteMediaComment(c.id)
      } catch {
        setComments((list) => [...list, c].sort((a, b) => a.created_at.localeCompare(b.created_at)))
      }
    }
  }

  const detail = (label: string, value: string) => (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04]">
      <span className="text-brand-600 text-[11px] font-heading tracking-wide uppercase">{label}</span>
      <span className="text-brand-200 text-xs font-body text-right truncate">{value}</span>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[88vh] bg-brand-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col lg:flex-row shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media pane */}
        <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center">
          {asset.type === 'image' ? (
            <img src={asset.url} alt="" className="max-h-full max-w-full object-contain" />
          ) : asset.type === 'video' ? (
            <video
              ref={videoRef}
              src={asset.url}
              controls
              playsInline
              className="max-h-full max-w-full"
            />
          ) : (
            <div className="w-full max-w-lg px-8">
              <div className="mb-6 flex items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-brand-900/60 border border-white/10 flex items-center justify-center">
                  <svg className="w-9 h-9 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              </div>
              <audio src={asset.url} controls className="w-full" />
            </div>
          )}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-3 right-3 w-9 h-9 rounded-full bg-brand-950/70 border border-white/15 text-white flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col min-h-0">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading font-semibold text-sm text-white truncate">
                  {asset.metadata?.name ?? `${asset.type} asset`}
                </p>
                <p className="text-brand-600 text-xs font-body mt-0.5 truncate">{asset.project_name ?? '—'}</p>
              </div>
              <button
                onClick={onClose}
                className="hidden lg:flex shrink-0 w-8 h-8 rounded-lg border border-white/10 text-brand-300 hover:text-white hover:border-white/30 items-center justify-center transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <a
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              download
              className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 bg-white text-black font-heading font-bold text-[11px] tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4" />
              </svg>
              DOWNLOAD
            </a>
          </div>

          {/* Details */}
          <div className="px-4 pt-3 pb-1">
            {detail('Type', asset.type)}
            {asset.metadata?.format && detail('Format', asset.metadata.format)}
            {(asset.metadata?.size || asset.file_size) &&
              detail('Size', asset.metadata?.size ?? formatBytes(asset.file_size ?? 0))}
            {detail('Status', asset.status)}
            {detail('Created', timeAgo(asset.created_at))}
          </div>

          {/* Comments */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h3 className="font-heading font-semibold text-[11px] text-brand-300 tracking-wider uppercase">
              Comments
            </h3>
            {demoMode && (
              <span className="text-[10px] font-heading tracking-wide text-amber-400/80">DEMO · not saved</span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-2.5">
            {loading ? (
              <p className="text-brand-700 text-xs font-body py-4">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="text-brand-700 text-xs font-body py-4">
                No comments yet. Leave a note{asset.type === 'video' ? ' — pin it to a moment in the video' : ''}.
              </p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className={`group rounded-xl p-3 border ${
                    c.resolved ? 'bg-green-500/[0.04] border-green-500/15' : 'bg-brand-900/40 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-heading font-semibold text-[11px] text-white truncate">
                      {c.author_name ?? 'Teammate'}
                    </span>
                    {c.timestamp_seconds != null && (
                      <button
                        onClick={() => seekTo(c.timestamp_seconds!)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-brand-100 text-[10px] font-heading tracking-wide transition-colors"
                        title="Jump to this moment"
                      >
                        @ {formatTimestamp(c.timestamp_seconds)}
                      </button>
                    )}
                    <span className="text-brand-700 text-[10px] font-body ml-auto shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-brand-300 text-xs font-body leading-snug">{c.body}</p>
                  <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleResolved(c)}
                      className="text-[10px] font-heading tracking-wide text-brand-500 hover:text-green-400 transition-colors"
                    >
                      {c.resolved ? 'REOPEN' : 'MARK DONE'}
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="text-[10px] font-heading tracking-wide text-brand-500 hover:text-red-400 transition-colors"
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-white/[0.06]">
            {asset.type === 'video' && (
              <button
                onClick={pinCurrentTime}
                className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/12 text-brand-300 hover:text-white hover:border-white/30 text-[11px] font-heading transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {pinTime != null ? `Pinned @ ${formatTimestamp(pinTime)}` : 'Pin to current frame'}
              </button>
            )}
            <div className="flex gap-2">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Leave feedback…"
                className="flex-1 px-3 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                onClick={submit}
                disabled={busy || !body.trim()}
                className="px-4 py-2.5 bg-white text-black font-heading text-xs font-bold rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 shrink-0"
              >
                {busy ? '…' : 'Send'}
              </button>
            </div>
            {pinTime != null && (
              <button onClick={() => setPinTime(null)} className="text-brand-600 hover:text-brand-400 text-[10px] font-body mt-1.5">
                Clear timestamp
              </button>
            )}
            {error && <p className="text-red-400 text-xs font-body mt-2">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
