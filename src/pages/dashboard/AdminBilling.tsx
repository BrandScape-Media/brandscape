import { useCallback, useEffect, useState } from 'react'
import {
  adminListAgencies,
  adminSetPlan,
  adminResetUsage,
  adminGrantCredits,
  adminCreditLedger,
  adminProvisionBilling,
  type AdminAgency,
  type CreditLedgerEntry,
  type RepricedPrice,
} from '../../lib/orchestrator'
import { creditPacks } from '../../data/plans'
import { timeAgo } from '../../lib/format'

/**
 * Billing controls until Stripe is live: move an agency between tiers, give
 * a month back, and grant purchased credits — each one audited in the credit
 * ledger instead of being an undocumented SQL edit.
 */

const TIERS = ['free', 'solo', 'starter', 'professional', 'enterprise'] as const

const UNLIMITED = 999_999
const fmt = (n: number) => (n >= UNLIMITED ? '∞' : n.toLocaleString())

export default function AdminBilling() {
  const [agencies, setAgencies] = useState<AdminAgency[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [openLedger, setOpenLedger] = useState<string | null>(null)
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([])
  const [grantFor, setGrantFor] = useState<string | null>(null)
  const [grantAmount, setGrantAmount] = useState('')
  const [provisioned, setProvisioned] = useState<number | null>(null)
  const [repriced, setRepriced] = useState<RepricedPrice[]>([])
  const [liveMode, setLiveMode] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await adminListAgencies()
      setAgencies(res.agencies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load agencies')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (key: string, fn: () => Promise<void>, done: string) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
      setNotice(done)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const showLedger = async (id: string) => {
    if (openLedger === id) {
      setOpenLedger(null)
      return
    }
    setOpenLedger(id)
    setLedger([])
    try {
      setLedger(await adminCreditLedger(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the ledger')
    }
  }

  const grant = async (id: string, amount: number) => {
    await run(`grant-${id}`, async () => {
      await adminGrantCredits(id, amount, 'staff grant from Mission Control')
    }, `${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount).toLocaleString()} credits.`)
    setGrantFor(null)
    setGrantAmount('')
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-red-400 text-xs font-body">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500/60 hover:text-red-400 text-xs font-heading">✕</button>
        </div>
      )}
      {notice && (
        <div className="px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-blue-300 text-xs font-body">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-blue-400/60 hover:text-blue-300 text-xs font-heading">✕</button>
        </div>
      )}

      <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">STRIPE CATALOGUE</h3>
          <button
            onClick={() => run('provision', async () => {
              const res = await adminProvisionBilling()
              setProvisioned(res.prices.length)
              setLiveMode(res.live_mode)
              setRepriced(res.repriced ?? [])
            }, 'Stripe products and prices are in sync.')}
            disabled={busy === 'provision'}
            className="px-3 py-1.5 border border-white/10 text-brand-300 hover:text-white hover:border-white/25 font-heading text-[11px] rounded-lg transition-all disabled:opacity-40"
          >
            {busy === 'provision' ? 'Provisioning…' : 'Provision in Stripe'}
          </button>
        </div>
        <p className="text-brand-600 text-[11px] font-body mb-3">
          Creates every sellable tier (monthly + yearly) and the credit packs in Stripe from the server&apos;s
          plan definitions, and records their price IDs. Safe to re-run — it reuses anything that already
          exists. Re-run after changing a price, and again after switching to the live key: the live
          catalogue is separate.
          {provisioned !== null && (
            <span className="text-green-400"> {provisioned} prices in sync{liveMode === false ? ' (test mode)' : liveMode ? ' (LIVE)' : ''}.</span>
          )}
        </p>

        {/* A re-price is a real money change and used to happen invisibly —
            Stripe prices are immutable, so the old amount kept billing while
            our table claimed the new one. Say it out loud. */}
        {repriced.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5">
            <p className="text-amber-300 text-[11px] font-heading font-bold tracking-wider mb-1.5">
              {repriced.length} PRICE{repriced.length === 1 ? '' : 'S'} CHANGED
            </p>
            <ul className="space-y-0.5">
              {repriced.map((r) => (
                <li key={r.lookup_key} className="text-brand-300 text-[11px] font-body">
                  <span className="text-white">{r.lookup_key}</span>{' '}
                  ${(r.from_cents / 100).toLocaleString()} → ${(r.to_cents / 100).toLocaleString()}
                </li>
              ))}
            </ul>
            <p className="text-brand-400 text-[10px] font-body mt-1.5">
              New Stripe prices were created and the old ones archived. Anyone already subscribed
              stays on the price they signed up at.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {creditPacks.map((p) => (
            <span key={p.id} className="px-3 py-1.5 rounded-lg bg-brand-900/50 border border-white/10 text-brand-300 text-[11px] font-body">
              {p.credits.toLocaleString()} credits — <span className="text-white font-heading">${p.priceUsd}</span>
              <span className="text-brand-700"> (${(p.priceUsd / p.credits).toFixed(3)}/cr)</span>
            </span>
          ))}
        </div>
        <p className="text-brand-700 text-[10px] font-body mt-3">
          Grants below stay available regardless — use them for comped credits or to fix a payment taken outside
          Stripe. Anything bought through Checkout is granted automatically by the webhook.
        </p>
      </div>

      {agencies === null ? (
        <div className="bg-brand-900/20 border border-white/5 rounded-xl h-64 animate-pulse" />
      ) : (
        <div className="space-y-3">
          {agencies.map((a) => {
            const creditsLeft = Math.max(a.limits.creditsPerMonth - a.usage_credits, 0) + a.credit_balance
            return (
              <div key={a.id} className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-sm text-white">{a.name}</p>
                    <p className="text-brand-600 text-[10px] font-body mt-0.5">
                      joined {timeAgo(a.created_at)} · cycle from {a.billing_cycle_start ?? '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={a.plan}
                      disabled={busy === `plan-${a.id}`}
                      onChange={(e) => run(`plan-${a.id}`, () => adminSetPlan(a.id, e.target.value), `${a.name} → ${e.target.value}`)}
                      className="px-2.5 py-1.5 bg-brand-900 border border-white/10 rounded-lg text-brand-300 font-body text-[11px] focus:outline-none focus:border-white/30 transition-colors"
                    >
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => run(`reset-${a.id}`, () => adminResetUsage(a.id), `${a.name}: counters reset.`)}
                      disabled={busy === `reset-${a.id}`}
                      className="px-3 py-1.5 border border-white/10 text-brand-300 hover:text-white hover:border-white/25 font-heading text-[11px] rounded-lg transition-all disabled:opacity-40"
                    >
                      Reset usage
                    </button>
                    <button
                      onClick={() => setGrantFor(grantFor === a.id ? null : a.id)}
                      className="px-3 py-1.5 border border-white/10 text-brand-300 hover:text-white hover:border-white/25 font-heading text-[11px] rounded-lg transition-all"
                    >
                      Grant credits
                    </button>
                    <button
                      onClick={() => showLedger(a.id)}
                      className="px-3 py-1.5 border border-white/10 text-brand-300 hover:text-white hover:border-white/25 font-heading text-[11px] rounded-lg transition-all"
                    >
                      {openLedger === a.id ? 'Hide ledger' : 'Ledger'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                  <Stat label="Credits left" value={fmt(creditsLeft)} accent={creditsLeft <= 0} />
                  <Stat label="Credits used" value={`${a.usage_credits.toLocaleString()} / ${fmt(a.limits.creditsPerMonth)}`} />
                  <Stat label="Purchased" value={a.credit_balance.toLocaleString()} />
                  <Stat label="Stage runs" value={`${a.usage_generations} / ${fmt(a.limits.generationsPerMonth)}`} />
                  <Stat label="Revisions" value={`${a.usage_revisions} / ${fmt(a.limits.revisionsPerMonth)}`} />
                </div>

                {grantFor === a.id && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="flex flex-wrap items-center gap-2">
                      {creditPacks.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => grant(a.id, p.credits)}
                          disabled={busy === `grant-${a.id}`}
                          className="px-3 py-1.5 rounded-lg bg-white text-black font-heading font-bold text-[11px] hover:bg-brand-200 transition-colors disabled:opacity-40"
                        >
                          +{p.credits.toLocaleString()} (${p.priceUsd})
                        </button>
                      ))}
                      <input
                        value={grantAmount}
                        onChange={(e) => setGrantAmount(e.target.value)}
                        placeholder="custom (− to remove)"
                        className="px-2.5 py-1.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-[11px] placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors w-44"
                      />
                      <button
                        onClick={() => {
                          const n = parseInt(grantAmount, 10)
                          if (Number.isInteger(n) && n !== 0) void grant(a.id, n)
                        }}
                        disabled={busy === `grant-${a.id}` || !Number.isInteger(parseInt(grantAmount, 10))}
                        className="px-3 py-1.5 border border-white/15 text-white font-heading text-[11px] rounded-lg hover:border-white/30 transition-colors disabled:opacity-30"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                {openLedger === a.id && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    {ledger.length === 0 ? (
                      <p className="text-brand-600 text-[11px] font-body">No credit movements yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] font-body">
                          <thead>
                            <tr className="text-brand-600 border-b border-white/5">
                              <th className="py-1.5 pr-3 font-heading">When</th>
                              <th className="py-1.5 pr-3 font-heading">Change</th>
                              <th className="py-1.5 pr-3 font-heading">Kind</th>
                              <th className="py-1.5 pr-3 font-heading">Project</th>
                              <th className="py-1.5 font-heading">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledger.map((e) => (
                              <tr key={e.id} className="border-b border-white/[0.03]">
                                <td className="py-1.5 pr-3 text-brand-500 whitespace-nowrap">{timeAgo(e.created_at)}</td>
                                <td className={`py-1.5 pr-3 whitespace-nowrap font-heading ${e.delta < 0 ? 'text-amber-400' : 'text-green-400'}`}>
                                  {e.delta > 0 ? '+' : ''}{e.delta}
                                </td>
                                <td className="py-1.5 pr-3 text-brand-400 whitespace-nowrap">{e.kind}</td>
                                <td className="py-1.5 pr-3 text-brand-500 truncate max-w-[180px]">{e.project_name ?? '—'}</td>
                                <td className="py-1.5 text-brand-600 truncate max-w-[220px]">{e.reason ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-brand-600 text-[9px] font-heading tracking-wider uppercase mb-0.5">{label}</p>
      <p className={`font-heading font-bold text-sm ${accent ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
