import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useClients } from '../../hooks/useData'
import { createClient, updateClient, deleteClient, type ClientInput } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import type { Client } from '../../types'

export default function ClientsPage() {
  const { user, demoMode } = useAuth()
  const { data: clients, loading, error, reload } = useClients()
  const [editing, setEditing] = useState<Client | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canDelete = user?.role === 'owner' || user?.role === 'admin'

  const handleSave = async (input: ClientInput) => {
    if (demoMode) {
      setActionError('Demo mode is read-only — sign in with a real account to manage clients.')
      return
    }
    if (editing === 'new') {
      await createClient(user!.agency_id!, input)
    } else if (editing) {
      await updateClient(editing.id, input)
    }
    setEditing(null)
    reload()
  }

  const handleDelete = async () => {
    if (!deleting) return
    if (demoMode) {
      setActionError('Demo mode is read-only — sign in with a real account to manage clients.')
      setDeleting(null)
      return
    }
    await deleteClient(deleting.id)
    setDeleting(null)
    reload()
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl">Clients</h1>
          <p className="text-brand-500 text-sm font-body mt-1">
            Manage your client database and brand profiles.
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
        >
          + ADD CLIENT
        </button>
      </div>

      {actionError && (
        <div className="mb-6 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-lg flex items-center justify-between">
          <p className="text-amber-400 text-xs font-body">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-amber-500/60 hover:text-amber-400 text-xs font-heading">✕</button>
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg">
          <p className="text-red-400 text-xs font-body">Could not load clients: {error}</p>
        </div>
      )}

      {loading ? (
        <LoadingRows />
      ) : !clients || clients.length === 0 ? (
        <EmptyState onAdd={() => setEditing('new')} />
      ) : (
        <div className="bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/5 text-xs font-heading tracking-wide uppercase text-brand-600">
            <div className="col-span-4">Client</div>
            <div className="col-span-3">Industry</div>
            <div className="col-span-2">Projects</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1"></div>
          </div>

          {clients.map((client) => (
            <div
              key={client.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0 group"
            >
              <div className="col-span-1 sm:col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/5 flex items-center justify-center text-sm font-heading font-bold text-brand-300 flex-shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="font-heading font-semibold text-sm text-white block truncate">{client.name}</span>
                  {client.website && (
                    <a href={client.website} target="_blank" rel="noreferrer" className="text-brand-700 hover:text-brand-500 text-xs font-body truncate block transition-colors">
                      {client.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
              <div className="col-span-1 sm:col-span-3 text-brand-500 text-sm font-body">{client.industry || '—'}</div>
              <div className="col-span-1 sm:col-span-2 text-brand-400 text-sm font-heading">{client.project_count ?? 0}</div>
              <div className="col-span-1 sm:col-span-2 text-brand-600 text-sm font-body">{timeAgo(client.updated_at)}</div>
              <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditing(client)}
                  title="Edit client"
                  className="p-2 text-brand-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {canDelete && (
                  <button
                    onClick={() => setDeleting(client)}
                    title="Delete client"
                    className="p-2 text-brand-500 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ClientModal
          client={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="This permanently removes the client and every project, stage, and asset under it. This cannot be undone."
          confirmLabel="Delete Client"
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

function ClientModal({ client, onSave, onClose }: {
  client: Client | null
  onSave: (input: ClientInput) => Promise<void>
  onClose: () => void
}) {
  const kit = (client?.brand_guidelines ?? {}) as { colors?: string[]; motto?: string }
  const [form, setForm] = useState<ClientInput>({
    name: client?.name ?? '',
    industry: client?.industry ?? '',
    website: client?.website ?? '',
    target_audience: client?.target_audience ?? '',
  })
  const [colors, setColors] = useState((kit.colors ?? []).join(', '))
  const [motto, setMotto] = useState(kit.motto ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedColors = colors
    .split(/[,\s]+/)
    .map((c) => c.trim())
    .filter((c) => /^#?[0-9a-fA-F]{3,8}$/.test(c))
    .map((c) => (c.startsWith('#') ? c : `#${c}`))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        brand_guidelines: { ...(client?.brand_guidelines ?? {}), colors: parsedColors, motto: motto.trim() },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the client.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-lg bg-brand-950 border border-white/10 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading font-bold text-lg mb-5">{client ? 'Edit Client' : 'Add Client'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="Client name"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Industry</label>
              <input
                type="text"
                value={form.industry ?? ''}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="e.g., Sportswear"
              />
            </div>
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Website</label>
              <input
                type="url"
                value={form.website ?? ''}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="https://…"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Target Audience</label>
            <textarea
              value={form.target_audience ?? ''}
              onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="Who is this brand talking to?"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Brand Colors <span className="text-brand-700">(hex, comma-separated)</span></label>
              <input
                type="text"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="#FF5733, #1A1A2E"
              />
              {parsedColors.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  {parsedColors.map((c, i) => (
                    <span key={i} title={c} className="w-5 h-5 rounded-md border border-white/15" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Brand Motto</label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
                placeholder='e.g., "Think Different"'
              />
            </div>
          </div>
          <p className="text-brand-700 text-[11px] font-body">
            Logo, product images, and font files are uploaded in Media Library → Uploads.
          </p>

          {error && (
            <p className="text-red-400 text-xs font-body bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || saving}
              className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : client ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose }: {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-sm bg-brand-950 border border-white/10 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading font-bold text-lg mb-2">{title}</h2>
        <p className="text-brand-500 text-sm font-body mb-6">{body}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => { setBusy(true); await onConfirm() }}
            disabled={busy}
            className="px-5 py-2.5 bg-red-500/90 text-white font-heading font-bold text-sm rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-5 py-4 border-b border-white/5 last:border-0 animate-pulse flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5" />
          <div className="space-y-2">
            <div className="h-3 w-40 bg-white/5 rounded" />
            <div className="h-2 w-24 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-20 bg-brand-900/20 border border-white/5 rounded-xl">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-900/50 border border-white/5 flex items-center justify-center">
        <svg className="w-7 h-7 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <p className="text-brand-400 font-heading text-sm mb-1">No clients yet</p>
      <p className="text-brand-700 font-body text-xs mb-6">Add your first client to start a project pipeline.</p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
      >
        + ADD CLIENT
      </button>
    </div>
  )
}
