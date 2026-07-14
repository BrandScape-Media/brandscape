import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  createShareLink,
  deleteComment,
  listProjectComments,
  listProjectShareLinks,
  setCommentResolved,
  setShareLinkActive,
} from '../../lib/api'
import { timeAgo, formatTimestamp } from '../../lib/format'
import type { ShareComment, ShareLink } from '../../types'

export default function ShareManager({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { demoMode } = useAuth()
  const [links, setLinks] = useState<ShareLink[]>([])
  const [comments, setComments] = useState<ShareComment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'links' | 'comments'>('links')

  const shareUrl = (token: string) => `${window.location.origin}/share/${token}`

  const load = async () => {
    if (demoMode) {
      setLinks([{ id: 'demo', agency_id: 'demo', project_id: projectId, token: 'demo', title: 'Demo Share', is_active: true, created_at: new Date().toISOString() }])
      setComments([
        { id: 'dc1', asset_id: null, author_name: 'Client Jane', body: 'Love the hero shot! Can we try a warmer grade?', timestamp_seconds: 4, resolved: false, created_at: new Date(Date.now() - 3600_000).toISOString() },
        { id: 'dc2', asset_id: null, author_name: 'Client Mark', body: 'Logo feels small on the 9:16 version.', timestamp_seconds: null, resolved: true, created_at: new Date(Date.now() - 7200_000).toISOString() },
      ])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [l, c] = await Promise.all([listProjectShareLinks(projectId), listProjectComments(projectId)])
      setLinks(l)
      setComments(c)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load share data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, demoMode])

  const handleCreate = async () => {
    if (demoMode) { setError('Demo mode is read-only.'); return }
    setCreating(true)
    setError(null)
    try {
      const token = await createShareLink(projectId)
      await navigator.clipboard?.writeText(shareUrl(token)).catch(() => undefined)
      setCopied(token)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the link.')
    } finally {
      setCreating(false)
    }
  }

  const copy = async (token: string) => {
    await navigator.clipboard?.writeText(shareUrl(token)).catch(() => undefined)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleActive = async (link: ShareLink) => {
    if (demoMode) return
    await setShareLinkActive(link.id, !link.is_active)
    load()
  }

  const resolve = async (c: ShareComment) => {
    if (demoMode) { setComments((prev) => prev.map((x) => x.id === c.id ? { ...x, resolved: !x.resolved } : x)); return }
    await setCommentResolved(c.id, !c.resolved)
    load()
  }

  const removeComment = async (c: ShareComment) => {
    if (demoMode) { setComments((prev) => prev.filter((x) => x.id !== c.id)); return }
    await deleteComment(c.id)
    load()
  }

  const openCount = comments.filter((c) => !c.resolved).length

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-2xl bg-brand-950 border border-white/10 rounded-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg">Share with client</h2>
          <button onClick={onClose} className="text-brand-500 hover:text-white text-sm">✕</button>
        </div>

        <div className="px-6 pt-4 flex items-center gap-1 border-b border-white/5">
          {(['links', 'comments'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-heading tracking-wide border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-white text-white' : 'border-transparent text-brand-500 hover:text-white'
              }`}
            >
              {t === 'links' ? 'Links' : `Comments${openCount ? ` (${openCount})` : ''}`}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto">
          {error && <p className="mb-4 text-red-400 text-xs font-body bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">{error}</p>}

          {tab === 'links' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-brand-500 text-sm font-body">
                  Clients open the link, enter their name, and leave feedback — including timestamped notes on videos.
                </p>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {creating ? 'Creating…' : '+ New Link'}
                </button>
              </div>

              {loading ? (
                <div className="h-16 bg-brand-900/30 rounded-xl animate-pulse" />
              ) : links.length === 0 ? (
                <p className="text-brand-700 text-sm font-body text-center py-8">No share links yet.</p>
              ) : (
                links.map((link) => (
                  <div key={link.id} className="bg-brand-900/30 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${link.is_active ? 'bg-green-500' : 'bg-brand-700'}`} />
                      <span className="text-white text-sm font-heading">{link.title ?? 'Share link'}</span>
                      <span className="text-brand-700 text-[10px] font-body ml-auto">{timeAgo(link.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={shareUrl(link.token)}
                        className="flex-1 px-3 py-2 bg-brand-900 border border-white/10 rounded-lg text-brand-400 font-body text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => copy(link.token)}
                        className="px-3 py-2 bg-white text-black font-heading text-xs font-bold rounded-lg hover:bg-brand-200 transition-colors flex-shrink-0"
                      >
                        {copied === link.token ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => toggleActive(link)}
                        title={link.is_active ? 'Deactivate' : 'Reactivate'}
                        className="px-3 py-2 border border-white/15 text-brand-300 hover:text-white hover:border-white/30 font-heading text-xs rounded-lg transition-colors flex-shrink-0"
                      >
                        {link.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="h-16 bg-brand-900/30 rounded-xl animate-pulse" />
              ) : comments.length === 0 ? (
                <p className="text-brand-700 text-sm font-body text-center py-8">No client comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className={`border rounded-xl p-4 ${c.resolved ? 'bg-brand-900/10 border-white/5 opacity-60' : 'bg-brand-900/30 border-white/5'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-heading font-semibold text-xs text-white">{c.author_name}</span>
                      {c.timestamp_seconds != null && (
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-brand-200 text-[10px] font-heading">@ {formatTimestamp(c.timestamp_seconds)}</span>
                      )}
                      <span className="text-brand-700 text-[10px] font-body ml-auto">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-brand-300 text-sm font-body leading-snug mb-3">{c.body}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => resolve(c)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-heading transition-colors ${
                          c.resolved ? 'border border-white/15 text-brand-400 hover:text-white' : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                        }`}
                      >
                        {c.resolved ? 'Reopen' : 'Mark done'}
                      </button>
                      <button
                        onClick={() => removeComment(c)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-heading text-brand-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
