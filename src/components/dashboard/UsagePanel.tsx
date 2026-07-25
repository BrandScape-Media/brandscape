import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getUsage, getBillingConfig, startCheckout, openBillingPortal, type BillingConfig } from '../../lib/orchestrator'
import { plans, creditPacks, creditWeights, creditsPerProjectShoot } from '../../data/plans'
import type { UsageSnapshot } from '../../types'

/**
 * The usage review: what's left on every meter, how long until it resets,
 * and how to get more. Numbers come from /v1/usage so the panel can never
 * promise something the orchestrator will refuse.
 *
 * Credits are the headline because they're the meter that actually stops
 * work — a full project shoot is ~150 of them.
 */

/** Days until the counters roll over (they reset on the 1st, UTC). */
function daysToReset(): number {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86_400_000))
}

const UNLIMITED = 999_999

function pct(used: number, limit: number) {
  if (limit >= UNLIMITED || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function toneFor(percent: number) {
  if (percent >= 100) return { bar: 'bg-red-500', text: 'text-red-400' }
  if (percent >= 80) return { bar: 'bg-amber-500', text: 'text-amber-400' }
  return { bar: 'bg-white/70', text: 'text-brand-400' }
}

export default function UsagePanel() {
  const { demoMode } = useAuth()
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  const [billing, setBilling] = useState<BillingConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wantCredits, setWantCredits] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)

  useEffect(() => {
    if (demoMode) return
    getUsage()
      .then(setUsage)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load usage.'))
    // billing is optional — if Stripe isn't switched on the panel still works
    getBillingConfig().then(setBilling).catch(() => setBilling({ configured: false, packs: [], tiers: [] }))
  }, [demoMode])

  /** Hand off to Stripe's hosted page; card details never touch our app. */
  const buy = async (packId: string) => {
    setBuying(packId)
    setError(null)
    try {
      window.location.href = await startCheckout({ kind: 'credits', pack: packId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
      setBuying(null)
    }
  }

  const manage = async () => {
    setBuying('portal')
    setError(null)
    try {
      window.location.href = await openBillingPortal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the billing portal.')
      setBuying(null)
    }
  }

  // demo mode has no API — show the starter plan's shape with sample numbers
  const demo: UsageSnapshot | null = useMemo(() => {
    if (!demoMode) return null
    const p = plans[0]
    return {
      plan: 'starter',
      cycle_start: null,
      meters: {
        generations: { used: 31, limit: p.generationsPerMonth },
        revisions: { used: 2, limit: p.revisionsIncluded },
        regenerations: { used: 63, limit: p.regenerationsPerMonth },
        credits: { used: 486, limit: p.creditsPerMonth },
        projects: { used: 2, limit: p.projectsIncluded },
        deliverable_projects: { used: 1, limit: p.deliverableProjects },
      },
      credit_balance: 0,
      credit_weights: creditWeights,
      credits_per_project_shoot: creditsPerProjectShoot,
      packs: creditPacks,
    }
  }, [demoMode])

  const data = usage ?? demo
  const days = daysToReset()

  if (error) {
    return (
      <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
        <p className="text-red-400 text-xs font-body">Could not load usage: {error}</p>
      </div>
    )
  }

  if (!data) {
    return <div className="bg-brand-900/20 border border-white/5 rounded-xl h-72 animate-pulse" />
  }

  const m = data.meters
  const creditsLeft = Math.max(m.credits.limit - m.credits.used, 0) + data.credit_balance
  const creditPct = pct(m.credits.used, m.credits.limit)
  const shootsLeft = Math.floor(creditsLeft / (data.credits_per_project_shoot || 150))
  // live Stripe prices win over the bundled copy, so the button and the
  // amount charged can never disagree
  const packs = billing?.configured && billing.packs.length ? billing.packs : data.packs?.length ? data.packs : creditPacks
  const weights = data.credit_weights ?? creditWeights
  const canBuy = !demoMode && !!billing?.configured && billing.packs.length > 0

  const outOfCredits = creditsLeft <= 0
  const lowCredits = !outOfCredits && creditsLeft < (data.credits_per_project_shoot || 150)

  return (
    <div className="space-y-5">
      {/* Headline: credits */}
      <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">GENERATION CREDITS</h3>
            <p className="text-brand-600 text-[11px] font-body mt-1">
              Spent per rendered asset. One full project shoot ≈ {data.credits_per_project_shoot} credits.
            </p>
          </div>
          <div className="text-right">
            <p className={`font-heading font-bold text-2xl ${outOfCredits ? 'text-red-400' : lowCredits ? 'text-amber-400' : 'text-white'}`}>
              {creditsLeft.toLocaleString()}
            </p>
            <p className="text-brand-600 text-[10px] font-heading tracking-wider">LEFT</p>
          </div>
        </div>

        <div className="h-2 bg-brand-800 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${toneFor(creditPct).bar}`} style={{ width: `${creditPct}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-body">
          <span className="text-brand-500">
            {m.credits.used.toLocaleString()} of {m.credits.limit.toLocaleString()} monthly allowance used
            {data.credit_balance > 0 && <> · +{data.credit_balance.toLocaleString()} purchased</>}
          </span>
          <span className="text-brand-600">Resets in {days} day{days === 1 ? '' : 's'}</span>
        </div>

        {/* Reminders — the whole point is you find out before you're stuck */}
        {outOfCredits ? (
          <div className="mt-4 px-4 py-3 bg-red-500/[0.07] border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-xs font-heading font-bold mb-1">You&apos;re out of credits</p>
            <p className="text-brand-300 text-[11px] font-body">
              Renders are paused until you top up or the allowance resets in {days} day{days === 1 ? '' : 's'}.
            </p>
          </div>
        ) : lowCredits ? (
          <div className="mt-4 px-4 py-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg">
            <p className="text-amber-400 text-xs font-heading font-bold mb-1">Not enough left for a full shoot</p>
            <p className="text-brand-300 text-[11px] font-body">
              {creditsLeft} credits remain — a complete project needs about {data.credits_per_project_shoot}.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-brand-500 text-[11px] font-body">
            Enough for roughly {shootsLeft} more full project shoot{shootsLeft === 1 ? '' : 's'}.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setWantCredits((v) => !v)}
            className="px-4 py-2 bg-white text-black font-heading font-bold text-xs rounded-lg hover:bg-brand-200 transition-colors"
          >
            {wantCredits ? 'Hide packs' : 'Buy more credits'}
          </button>
          {billing?.has_customer && (
            <button
              onClick={() => void manage()}
              disabled={buying === 'portal'}
              className="px-4 py-2 border border-white/15 text-white font-heading text-xs rounded-lg hover:border-white/30 transition-colors disabled:opacity-40"
            >
              {buying === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
          <span className="text-brand-700 text-[11px] font-body">
            {Object.entries(weights).map(([k, v]) => `${k} ${v}`).join(' · ')}
          </span>
        </div>

        {wantCredits && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packs.map((pack) => {
                const shoots = Math.floor(pack.credits / (data.credits_per_project_shoot || 150))
                return (
                  <div key={pack.id} className="rounded-xl border border-white/10 bg-brand-900/40 p-4 flex flex-col">
                    <p className="font-heading font-bold text-lg text-white">{pack.credits.toLocaleString()}</p>
                    <p className="text-brand-500 text-[11px] font-body">credits</p>
                    <p className="font-heading font-bold text-sm text-white mt-3">${pack.priceUsd}</p>
                    <p className="text-brand-700 text-[10px] font-body">
                      ${(pack.priceUsd / pack.credits).toFixed(3)} per credit · {shoots} shoot{shoots === 1 ? '' : 's'}
                    </p>
                    {canBuy && (
                      <button
                        onClick={() => void buy(pack.id)}
                        disabled={!!buying}
                        className="mt-3 w-full px-3 py-2 bg-white text-black font-heading font-bold text-[11px] rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40"
                      >
                        {buying === pack.id ? 'Opening…' : 'Buy'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {canBuy ? (
              <p className="text-brand-600 text-[11px] font-body mt-3">
                Payment is handled by Stripe — card details never touch Brandscape. Credits land the moment the
                payment clears and never expire.
                {billing?.live_mode === false && (
                  <span className="text-amber-400"> Test mode: no real money moves.</span>
                )}
              </p>
            ) : (
              <p className="text-brand-500 text-[11px] font-body mt-3">
                Card payment isn&apos;t switched on yet — email{' '}
                <a href="mailto:billing@brandscape.media" className="text-white underline underline-offset-2 hover:text-brand-200">
                  billing@brandscape.media
                </a>{' '}
                and we&apos;ll add the credits to your account the same day. Purchased credits never expire.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Everything else */}
      <div className="bg-brand-900/20 border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">THIS MONTH</h3>
          <span className="text-brand-600 text-[10px] font-heading tracking-wider uppercase">{data.plan} plan</span>
        </div>
        <div className="space-y-4">
          <Meter label="AI stage runs" hint="Research, Ideation, Scripts, Shoot Plan" {...m.generations} />
          <Meter label="AI revisions" hint="Chat rewrites of a stage output" {...m.revisions} />
          <Meter label="Raws actions" hint="Presses of Regenerate / Generate all" {...m.regenerations} />
          <Meter
            label="Active projects"
            hint="Non-archived campaigns"
            {...m.projects}
            resets={false}
            atLimit="Limit reached — archive one or upgrade."
          />
          <Meter
            label="Projects in Deliverables"
            hint="Campaigns taken through to final creatives"
            {...m.deliverable_projects}
            resets={false}
            atLimit="All finishing slots used — upgrade to take more campaigns to final creatives."
          />
        </div>
      </div>
    </div>
  )
}

function Meter({ label, hint, used, limit, resets = true, atLimit }: {
  label: string
  hint: string
  used: number
  limit: number
  /** false for standing caps (projects), which don't roll over monthly */
  resets?: boolean
  /** what to say once the meter is full; defaults to the monthly-reset line */
  atLimit?: string
}) {
  const unlimited = limit >= UNLIMITED
  const percent = pct(used, limit)
  const tone = toneFor(percent)
  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <p className="text-brand-300 text-xs font-heading">{label}</p>
          <p className="text-brand-700 text-[10px] font-body truncate">{hint}</p>
        </div>
        <p className={`text-xs font-heading shrink-0 ${tone.text}`}>
          {unlimited ? `${used.toLocaleString()} · unlimited` : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </p>
      </div>
      <div className="h-1.5 bg-brand-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${unlimited ? 'bg-white/20' : tone.bar}`} style={{ width: `${unlimited ? 4 : percent}%` }} />
      </div>
      {!unlimited && percent >= 80 && (
        <p className={`mt-1 text-[10px] font-body ${tone.text}`}>
          {percent >= 100
            ? atLimit ?? 'Limit reached — resets on the 1st.'
            : `${limit - used} left${resets ? ' this month' : ''}.`}
        </p>
      )}
    </div>
  )
}
