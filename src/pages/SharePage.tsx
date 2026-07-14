import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { addShareComment, getShare, listShareComments } from '../lib/api'
import { timeAgo, formatTimestamp } from '../lib/format'
import type { ShareComment, SharedAsset, SharedGallery } from '../types'

const NAME_KEY = 'bs_share_name'

// Local demo gallery so /share/demo works without a backend session.
const DEMO_GALLERY: SharedGallery = {
  title: 'Nike — Summer Campaign',
  project_name: 'Nike — Summer Campaign',
  assets: [
    { id: 'd1', type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', name: 'Hero Video 30s', created_at: new Date().toISOString() },
    { id: 'd2', type: 'image', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200', name: 'Social Creative A', created_at: new Date().toISOString() },
    { id: 'd3', type: 'image', url: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=1200', name: 'Lifestyle Still', created_at: new Date().toISOString() },
  ],
}

export default function SharePage() {
  const { token = '' } = useParams()
  const demo = !isSupabaseConfigured() || token === 'demo'

  const [name, setName] = useState<string>(() => localStorage.getItem(NAME_KEY) ?? '')
  const [nameInput, setNameInput] = useState('')
  const [gallery, setGallery] = useState<SharedGallery | null>(null)
  const [comments, setComments] = useState<ShareComment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [active, setActive] = useState<SharedAsset | null>(null)

  const reloadComments = useCallback(async () => {
    if (demo) {
      setComments(JSON.parse(localStorage.getItem(`bs_demo_comments_${token}`) ?? '[]'))
      return
    }
    try {
      setComments(await listShareComments(token))
    } catch {
      /* non-fatal */
    }
  }, [demo, token])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const g = demo ? DEMO_GALLERY : await getShare(token)
        if (cancelled) return
        if (!g) {
          setNotFound(true)
        } else {
          setGallery(g)
          setActive(g.assets[0] ?? null)
          await reloadComments()
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [demo, token, reloadComments])

  const submitName = (e: React.FormEvent) => {
    e.preventDefault()
    const n = nameInput.trim()
    if (n.length < 2) return
    localStorage.setItem(NAME_KEY, n)
    setName(n)
  }

  const addComment = async (body: string, assetId: string | null, ts: number | null) => {
    if (demo) {
      const next = [
        ...comments,
        { id: crypto.randomUUID(), asset_id: assetId, author_name: name, body, timestamp_seconds: ts, resolved: false, created_at: new Date().toISOString() },
      ]
      setComments(next)
      localStorage.setItem(`bs_demo_comments_${token}`, JSON.stringify(next))
      return
    }
    await addShareComment({ token, author: name, body, assetId, timestampSeconds: ts })
    await reloadComments()
  }

  if (loading) {
    return <Centered><div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" /></Centered>
  }

  if (notFound || !gallery) {
    return (
      <Centered>
        <div className="text-center">
          <img src="/logo-dark.png" alt="Brandscape" className="h-8 w-auto mx-auto mb-6" />
          <p className="text-brand-300 font-heading text-lg mb-1">This share link isn&apos;t available</p>
          <p className="text-brand-600 font-body text-sm">It may have been deactivated or the link is incorrect.</p>
        </div>
      </Centered>
    )
  }

  // Name gate
  if (!name) {
    return (
      <Centered>
        <div className="w-full max-w-sm">
          <img src="/logo-dark.png" alt="Brandscape" className="h-8 w-auto mx-auto mb-8" />
          <div className="bg-brand-900/40 border border-white/5 rounded-2xl p-6">
            <h1 className="font-heading font-bold text-lg mb-1">{gallery.title}</h1>
            <p className="text-brand-500 text-sm font-body mb-5">Enter your name to review the content and leave feedback.</p>
            <form onSubmit={submitName} className="space-y-3">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="submit"
                disabled={nameInput.trim().length < 2}
                className="w-full px-5 py-3 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </Centered>
    )
  }

  const assetComments = active ? comments.filter((c) => c.asset_id === active.id) : []

  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <header className="border-b border-white/5 sticky top-0 bg-brand-black/90 backdrop-blur-xl z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-base truncate">{gallery.title}</h1>
            <p className="text-brand-600 text-xs font-body">Reviewing as {name}</p>
          </div>
          <img src="/logo-dark.png" alt="Brandscape" className="h-6 w-auto flex-shrink-0" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gallery + viewer */}
        <div className="lg:col-span-2 space-y-6">
          {gallery.assets.length === 0 ? (
            <div className="text-center py-20 bg-brand-900/20 border border-white/5 rounded-xl">
              <p className="text-brand-400 font-heading text-sm mb-1">No content yet</p>
              <p className="text-brand-700 font-body text-xs">The agency hasn&apos;t published media to this link yet.</p>
            </div>
          ) : (
            <>
              <AssetViewer key={active?.id} asset={active} onAddComment={addComment} />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {gallery.assets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setActive(a)}
                    className={`aspect-square rounded-lg overflow-hidden border transition-all ${
                      active?.id === a.id ? 'border-white' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    {a.type === 'image' ? (
                      <img src={a.thumbnail_url ?? a.url} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-brand-900 flex items-center justify-center">
                        <TypeGlyph type={a.type} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Comments */}
        <div>
          <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-brand-400 mb-4">
            Comments {active ? `· ${active.name}` : ''}
          </h2>
          <div className="space-y-3">
            {assetComments.length === 0 && (
              <p className="text-brand-700 text-xs font-body">No comments yet. Be the first to leave feedback.</p>
            )}
            {assetComments.map((c) => (
              <div key={c.id} className="bg-brand-900/30 border border-white/5 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-heading font-semibold text-xs text-white">{c.author_name}</span>
                  {c.timestamp_seconds != null && (
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-brand-200 text-[10px] font-heading tracking-wide">
                      @ {formatTimestamp(c.timestamp_seconds)}
                    </span>
                  )}
                  {c.resolved && (
                    <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 text-[10px] font-heading tracking-wide">DONE</span>
                  )}
                  <span className="text-brand-700 text-[10px] font-body ml-auto">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-brand-300 text-sm font-body leading-snug">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AssetViewer({ asset, onAddComment }: {
  asset: SharedAsset | null
  onAddComment: (body: string, assetId: string | null, ts: number | null) => Promise<void>
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [body, setBody] = useState('')
  const [pinTime, setPinTime] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!asset) return null

  const pinCurrentTime = () => {
    const t = videoRef.current?.currentTime
    if (t != null) setPinTime(Math.floor(t))
  }

  const submit = async () => {
    if (!body.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onAddComment(body.trim(), asset.id, asset.type === 'video' ? pinTime : null)
      setBody('')
      setPinTime(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your comment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-brand-900/20 border border-white/5 rounded-xl overflow-hidden">
      <div className="bg-black flex items-center justify-center">
        {asset.type === 'image' ? (
          <img src={asset.url} alt={asset.name} className="max-h-[420px] w-auto object-contain" />
        ) : asset.type === 'video' ? (
          <video ref={videoRef} src={asset.url} controls className="max-h-[420px] w-full" />
        ) : (
          <audio src={asset.url} controls className="w-full m-6" />
        )}
      </div>

      <div className="p-4">
        <p className="font-heading font-semibold text-sm text-white mb-3">{asset.name}</p>

        {asset.type === 'video' && (
          <button
            onClick={pinCurrentTime}
            className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-brand-300 hover:text-white hover:border-white/30 text-xs font-heading transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {pinTime != null ? `Commenting @ ${formatTimestamp(pinTime)}` : 'Pin comment to current time'}
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
            className="px-4 py-2.5 bg-white text-black font-heading text-xs font-bold rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 flex-shrink-0"
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
  )
}

function TypeGlyph({ type }: { type: 'image' | 'video' | 'audio' }) {
  const d = type === 'video'
    ? 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
    : 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z'
  return (
    <svg className="w-6 h-6 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-brand-black text-brand-white flex items-center justify-center p-6">{children}</div>
}
