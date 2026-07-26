import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAgency } from '../../hooks/useData'
import * as api from '../../lib/api'
import { timeAgo } from '../../lib/format'
import type { AgencyInvite, AgencyMember } from '../../types'

/**
 * Team seats.
 *
 * The schema always allowed several people per agency — every RLS policy
 * scopes to current_agency_id() — there was just no way in. Invites are
 * copyable links rather than emails on purpose: it works today, without
 * waiting on transactional mail, and an agency owner is going to paste it
 * into Slack anyway.
 *
 * The link is bound to the address it was issued for (migration 023), so
 * forwarding it doesn't hand over the agency.
 */

const DEMO_MEMBERS: AgencyMember[] = [
  { id: 'demo-1', email: 'you@agency.com', name: 'Demo User', role: 'owner', created_at: new Date(Date.now() - 86_400_000 * 120).toISOString() },
  { id: 'demo-2', email: 'sam@agency.com', name: 'Sam Rivera', role: 'admin', created_at: new Date(Date.now() - 86_400_000 * 44).toISOString() },
  { id: 'demo-3', email: 'jo@agency.com', name: 'Jo Baptiste', role: 'member', created_at: new Date(Date.now() - 86_400_000 * 9).toISOString() },
]

export default function TeamPage() {
  const { user, demoMode } = useAuth()
  const { data: agency } = useAgency()
  const [members, setMembers] = useState<AgencyMember[]>([])
  const [invites, setInvites] = useState<AgencyInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [freshLink, setFreshLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const canManage = user?.role === 'owner' || user?.role === 'admin'

  const load = useCallback(async () => {
    if (demoMode) {
      setMembers(DEMO_MEMBERS)
      setInvites([])
      setLoading(false)
      return
    }
    if (!agency?.id) return
    try {
      const [m, i] = await Promise.all([
        api.listAgencyMembers(agency.id),
        // only owners/admins get rows back; the RPC filters by role itself
        canManage ? api.listAgencyInvites() : Promise.resolve([]),
      ])
      setMembers(m)
      setInvites(i)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your team.')
    } finally {
      setLoading(false)
    }
  }, [agency?.id, canManage, demoMode])

  useEffect(() => {
    void load()
  }, [load])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFreshLink(null)
    setCopied(false)
    if (demoMode) {
      setError('Demo mode has no real agency to invite anyone into.')
      return
    }
    setBusy(true)
    try {
      const token = await api.createAgencyInvite(email.trim(), role)
      setFreshLink(`${window.location.origin}/invite/${token}`)
      setEmail('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the invite.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!freshLink) return
    try {
      await navigator.clipboard.writeText(freshLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the input is selectable, so this is recoverable */
    }
  }

  const revoke = async (id: string) => {
    setError('')
    try {
      await api.revokeAgencyInvite(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke that invite.')
    }
  }

  const remove = async (member: AgencyMember) => {
    setError('')
    try {
      await api.removeAgencyMember(member.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that person.')
    }
  }

  return (
    <div className="max-w-[1600px] space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-white">Team</h1>
        <p className="text-brand-500 text-sm font-body mt-1">
          Everyone here shares {agency?.name ?? 'your agency'}&apos;s clients, projects and credits.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-5 py-4">
          <p className="text-red-400 text-sm font-body">{error}</p>
        </div>
      )}

      {canManage && (
        <div className="rounded-2xl border border-white/[0.07] bg-brand-900/30 p-6">
          <h2 className="font-heading font-bold text-white text-sm mb-1">Invite someone</h2>
          <p className="text-brand-400 text-xs font-body mb-4">
            You&apos;ll get a link to send them. It only works for the address you enter, and expires
            in 7 days.
          </p>

          <form onSubmit={invite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="colleague@agency.com"
              className="flex-1 px-4 py-3 bg-brand-900/50 border border-white/10 rounded-xl text-white font-body text-sm placeholder:text-brand-500 focus:outline-none focus:border-white/25 transition-all"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="px-4 py-3 bg-brand-900/50 border border-white/10 rounded-xl text-white font-body text-sm focus:outline-none focus:border-white/25 transition-all"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-3 bg-white text-black font-heading font-bold text-sm rounded-xl hover:bg-brand-200 transition-colors disabled:opacity-40"
            >
              {busy ? 'Creating…' : 'Create invite'}
            </button>
          </form>

          {freshLink && (
            <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-4">
              <p className="text-violet-200 text-xs font-heading font-bold tracking-wider mb-2">
                SEND THEM THIS LINK
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={freshLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-brand-200 font-mono text-xs focus:outline-none"
                />
                <button
                  onClick={copy}
                  className="px-4 py-2 bg-white text-black font-heading font-bold text-xs rounded-lg hover:bg-brand-200 transition-colors"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-brand-400 text-[11px] font-body mt-2">
                Shown once — if you lose it, revoke the invite below and make a new one.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div className="rounded-2xl border border-white/[0.07] bg-brand-900/30 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-heading font-bold text-white text-sm">
            Members {!loading && <span className="text-brand-400 font-normal">· {members.length}</span>}
          </h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
            <div className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-brand-200 text-xs font-heading font-bold shrink-0">
                  {m.name?.charAt(0)?.toUpperCase() ?? m.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-heading truncate">
                    {m.name || m.email}
                    {m.id === user?.id && <span className="text-brand-400 font-normal"> · you</span>}
                  </p>
                  <p className="text-brand-400 text-xs font-body truncate">{m.email}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-brand-200 text-[11px] font-heading tracking-wide capitalize shrink-0">
                  {m.role}
                </span>
                {canManage && m.role !== 'owner' && m.id !== user?.id && (
                  <button
                    onClick={() => void remove(m)}
                    className="text-brand-400 hover:text-red-400 text-xs font-heading transition-colors shrink-0"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending invites */}
      {canManage && invites.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-brand-900/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="font-heading font-bold text-white text-sm">
              Pending invites <span className="text-brand-400 font-normal">· {invites.length}</span>
            </h2>
          </div>
          <ul className="divide-y divide-white/5">
            {invites.map((i) => {
              const expired = new Date(i.expires_at).getTime() < Date.now()
              return (
                <li key={i.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-heading truncate">{i.email}</p>
                    <p className="text-brand-400 text-xs font-body">
                      Invited {timeAgo(i.created_at)} ·{' '}
                      {expired ? (
                        <span className="text-amber-400">expired</span>
                      ) : (
                        `expires ${new Date(i.expires_at).toLocaleDateString()}`
                      )}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-brand-200 text-[11px] font-heading tracking-wide capitalize shrink-0">
                    {i.role}
                  </span>
                  <button
                    onClick={() => void revoke(i.id)}
                    className="text-brand-400 hover:text-red-400 text-xs font-heading transition-colors shrink-0"
                  >
                    Revoke
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
