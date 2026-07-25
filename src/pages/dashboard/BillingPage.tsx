import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAgency } from '../../hooks/useData'
import { getCreditLedger } from '../../lib/api'
import {
  getUsage,
  getBillingConfig,
  startCheckout,
  openBillingPortal,
  type BillingConfig,
} from '../../lib/orchestrator'
import { takeCheckoutIntent } from '../../lib/checkoutIntent'
import { plans, planFor, creditPacks, creditWeights, creditsPerProjectShoot } from '../../data/plans'
import UsageMeters, { daysToReset } from '../../components/dashboard/UsageMeters'
import CreditPackGrid from '../../components/dashboard/CreditPackGrid'
import OfferStrip from '../../components/dashboard/OfferStrip'
import type { CreditLedgerEntry, PlanTier, UsageSnapshot } from '../../types'

/**
 * Billing: what you have, what it's going at, and how to get more.
 *
 * Credits lead because they're the meter that actually stops work. Everything
 * here is informational — the burn-rate projection, the per-credit rates, the
 * annual saving — rather than pressure: no countdown theatre on things that
 * aren't really expiring, and top-ups are never automatic.
 */

/** Tween a number up on mount. setInterval rather than rAF so it still runs
 *  under a throttled preview. */
function useCountUp(target: number, ms = 700) {
  const [value, setValue] = useState(0)
  const previous = useRef(0)
  useEffect(() => {
    const from = previous.current
    previous.current = target
    if (from === target) return setValue(target)
    const started = Date.now()
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / ms)
      // ease-out so it decelerates into the real number
      setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3))))
      if (t >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [target, ms])
  return value
}

function Donut({ percent, tone }: { percent: number; tone: string }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * circumference
  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 -rotate-90">
      <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" className="stroke-brand-800" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className={`${tone} transition-[stroke-dasharray] duration-700`}
        strokeDasharray={`${filled} ${circumference - filled}`}
      />
    </svg>
  )
}

export default function BillingPage() {
  const { demoMode } = useAuth()
  const { data: agency } = useAgency()
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  const [billing, setBilling] = useState<BillingConfig | null>(null)
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [yearly, setYearly] = useState(false)
  const resumed = useRef(false)

  const packsRef = useRef<HTMLDivElement>(null)
  const plansRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (demoMode) return
    getUsage().then(setUsage).catch((err) => setError(err instanceof Error ? err.message : 'Could not load usage.'))
    getBillingConfig()
      .then(setBilling)
      .catch(() => setBilling({ configured: false, packs: [], tiers: [] }))
  }, [demoMode])

  useEffect(() => {
    if (demoMode || !agency?.id) return
    getCreditLedger(agency.id).then(setLedger).catch(() => setLedger([]))
  }, [demoMode, agency?.id])

  // Returning from Stripe. The webhook is what actually grants, and it may
  // land a moment after the redirect, so refetch rather than trusting the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('checkout')
    if (!outcome) return
    setNotice(
      outcome === 'success'
        ? 'Payment received — your account updates the moment Stripe confirms it (usually a second or two).'
        : 'Checkout cancelled. Nothing was charged.',
    )
    window.history.replaceState({}, '', window.location.pathname)
    if (outcome === 'success' && !demoMode) {
      const again = setTimeout(() => {
        getUsage().then(setUsage).catch(() => {})
        getBillingConfig().then(setBilling).catch(() => {})
        if (agency?.id) getCreditLedger(agency.id).then(setLedger).catch(() => {})
      }, 2500)
      return () => clearTimeout(again)
    }
  }, [demoMode, agency?.id])

  const buyPlan = useCallback(
    async (tier: PlanTier, interval: 'month' | 'year') => {
      setBusy(tier)
      setError(null)
      try {
        window.location.href = await startCheckout({ kind: 'subscription', tier, interval })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start checkout.')
        setBusy(null)
      }
    },
    [],
  )

  // A plan chosen on the pricing page before signing up. Fires once, only
  // after billing config confirms Stripe is actually switched on.
  useEffect(() => {
    if (demoMode || resumed.current || !billing?.configured || !agency?.id) return
    const intent = takeCheckoutIntent()
    if (!intent) return
    resumed.current = true
    void buyPlan(intent.tier, intent.interval)
  }, [demoMode, billing?.configured, agency?.id, buyPlan])

  const buyCredits = async (packId: string) => {
    setBusy(packId)
    setError(null)
    try {
      window.location.href = await startCheckout({ kind: 'credits', pack: packId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
      setBusy(null)
    }
  }

  const manage = async () => {
    setBusy('portal')
    setError(null)
    try {
      window.location.href = await openBillingPortal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the billing portal.')
      setBusy(null)
    }
  }

  // demo mode has no API — show the starter shape with sample numbers
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

  // ---- burn rate, from the ledger rather than a guess -----------------
  const burn = useMemo(() => {
    const since = Date.now() - 14 * 86_400_000
    const spends = ledger.filter((e) => e.delta < 0 && new Date(e.created_at).getTime() >= since)
    if (spends.length === 0) return null
    const total = spends.reduce((sum, e) => sum + Math.abs(e.delta), 0)
    // measure over the window we actually have data for, not a flat 14 days,
    // so a brand-new account isn't reported as spending nothing
    const oldest = Math.min(...spends.map((e) => new Date(e.created_at).getTime()))
    const daysCovered = Math.max(1, Math.ceil((Date.now() - oldest) / 86_400_000))
    return { perDay: total / daysCovered, total, daysCovered }
  }, [ledger])

  /** Spend per day over the last 14 days, oldest first, for the sparkline. */
  const sparkline = useMemo(() => {
    const buckets = new Array(14).fill(0)
    for (const entry of ledger) {
      if (entry.delta >= 0) continue
      const age = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / 86_400_000)
      if (age >= 0 && age < 14) buckets[13 - age] += Math.abs(entry.delta)
    }
    return buckets
  }, [ledger])

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-brand-900/20 border border-red-500/20 rounded-xl p-5">
          <p className="text-red-400 text-sm font-body">Could not load billing: {error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 space-y-5">
        <div className="h-40 bg-brand-900/20 border border-white/5 rounded-2xl animate-pulse" />
        <div className="h-72 bg-brand-900/20 border border-white/5 rounded-2xl animate-pulse" />
      </div>
    )
  }

  const m = data.meters
  const shootCost = data.credits_per_project_shoot || creditsPerProjectShoot
  const allowanceLeft = Math.max(m.credits.limit - m.credits.used, 0)
  const creditsLeft = allowanceLeft + data.credit_balance
  const usedPct = m.credits.limit > 0 ? Math.min(100, Math.round((m.credits.used / m.credits.limit) * 100)) : 100
  const shootsLeft = Math.floor(creditsLeft / shootCost)
  const outOfCredits = creditsLeft <= 0
  const lowCredits = !outOfCredits && creditsLeft < shootCost

  const currentTier = (data.plan ?? 'free') as PlanTier
  const currentPlan = planFor(currentTier)
  const livePacks = billing?.configured && billing.packs.length ? billing.packs : data.packs?.length ? data.packs : creditPacks
  const canBuy = !demoMode && !!billing?.configured && billing.packs.length > 0
  const canSubscribe = !demoMode && !!billing?.configured
  const subscribed = ['active', 'trialing', 'past_due'].includes(billing?.subscription_status ?? '')
  const trialing = billing?.subscription_status === 'trialing'
  const trialDaysLeft = billing?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(billing.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null

  const countUp = creditsLeft
  const runsOutIn = burn && burn.perDay > 0 ? Math.floor(creditsLeft / burn.perDay) : null

  /** Live Stripe amount wins over the bundled copy, so a button can never
   *  quote a price Stripe won't charge. */
  const priceFor = (tier: PlanTier, interval: 'month' | 'year') => {
    const live = billing?.tiers?.find((t) => t.tier === tier && t.interval === interval)
    if (live) return live.priceUsd
    const p = plans.find((x) => x.tier === tier)
    return interval === 'year' ? p?.priceYearly ?? 0 : p?.priceMonthly ?? 0
  }

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="font-heading font-black text-2xl tracking-tight">Billing</h1>
        <p className="text-brand-500 text-sm font-body mt-1">
          Your plan, your credits, and where they&apos;re going.
        </p>
      </div>

      {notice && (
        <div className="rounded-xl border border-white/10 bg-brand-900/30 px-5 py-4">
          <p className="text-brand-200 text-sm font-body">{notice}</p>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-5 py-4">
          <p className="text-red-400 text-sm font-body">{error}</p>
        </div>
      )}

      {/* ---- Status: one banner, most urgent wins ---- */}
      <StatusBanner
        tier={currentTier}
        trialing={trialing}
        trialDaysLeft={trialDaysLeft}
        pastDue={billing?.subscription_status === 'past_due'}
        outOfCredits={outOfCredits}
        lowCredits={lowCredits}
        creditsLeft={creditsLeft}
        shootCost={shootCost}
        resetDays={days}
        onUpgrade={() => scrollTo(plansRef)}
        onCredits={() => scrollTo(packsRef)}
        onManage={() => void manage()}
      />

      {/* ---- Hero: credits + plan ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Credits */}
        <div className="lg:col-span-3 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-brand-900/50 to-brand-900/20 p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative shrink-0">
              <Donut
                percent={m.credits.limit > 0 ? 100 - usedPct : 0}
                tone={outOfCredits ? 'stroke-red-500' : lowCredits ? 'stroke-amber-500' : 'stroke-white'}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-heading font-black text-2xl leading-none ${
                    outOfCredits ? 'text-red-400' : lowCredits ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  <CountUp value={countUp} />
                </span>
                <span className="text-brand-600 text-[9px] font-heading tracking-widest mt-1">LEFT</span>
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <h2 className="font-heading font-semibold text-xs text-brand-300 tracking-wider mb-2">
                GENERATION CREDITS
              </h2>
              <p className="text-brand-400 text-sm font-body leading-relaxed mb-3">
                {outOfCredits ? (
                  <>Renders are paused. Top up, or wait {days} day{days === 1 ? '' : 's'} for the reset.</>
                ) : shootsLeft === 0 ? (
                  <>
                    Enough for individual renders, but{' '}
                    <strong className="text-white">not a full shoot</strong> — those need about {shootCost}.
                  </>
                ) : (
                  <>
                    Enough for roughly <strong className="text-white">{shootsLeft}</strong> more full
                    shoot{shootsLeft === 1 ? '' : 's'}.
                  </>
                )}
              </p>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-body">
                <dt className="text-brand-600">Monthly allowance</dt>
                <dd className="text-brand-300 text-right">
                  {allowanceLeft.toLocaleString()} of {m.credits.limit.toLocaleString()} left
                </dd>
                <dt className="text-brand-600">Purchased balance</dt>
                <dd className="text-brand-300 text-right">{data.credit_balance.toLocaleString()}</dd>
                <dt className="text-brand-600">Allowance resets</dt>
                <dd className="text-brand-300 text-right">in {days} day{days === 1 ? '' : 's'}</dd>
                {runsOutIn !== null && !outOfCredits && (
                  <>
                    <dt className="text-brand-600">At your recent pace</dt>
                    <dd className={`text-right ${runsOutIn < days ? 'text-amber-400' : 'text-brand-300'}`}>
                      ~{runsOutIn} day{runsOutIn === 1 ? '' : 's'} of credits
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
            <button
              onClick={() => scrollTo(packsRef)}
              className="px-4 py-2 bg-white text-black font-heading font-bold text-xs rounded-lg hover:bg-brand-200 transition-colors"
            >
              Buy credits
            </button>
            <span className="text-brand-700 text-[11px] font-body">
              {Object.entries(data.credit_weights ?? creditWeights)
                .map(([k, v]) => `${k === 'talkinghead' ? 'talking head' : k} ${v}`)
                .join(' · ')}
            </span>
          </div>
        </div>

        {/* Plan */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] bg-brand-900/30 p-6 flex flex-col">
          <h2 className="font-heading font-semibold text-xs text-brand-300 tracking-wider mb-3">
            CURRENT PLAN
          </h2>
          <p className="font-heading font-black text-3xl text-white">{currentPlan.name}</p>
          <p className="text-brand-500 text-sm font-body mt-1">
            {currentTier === 'free'
              ? 'No subscription'
              : `$${currentPlan.priceMonthly.toLocaleString()}/month`}
          </p>

          <div className="mt-4 space-y-1.5 text-[11px] font-body">
            {trialing && trialDaysLeft !== null && (
              <p className="text-amber-400">
                Trial — {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left
              </p>
            )}
            {!trialing && billing?.subscription_period_end && (
              <p className="text-brand-500">
                Renews {new Date(billing.subscription_period_end).toLocaleDateString()}
              </p>
            )}
            <p className="text-brand-600">
              {currentPlan.projectsIncluded >= 999 ? 'Unlimited' : currentPlan.projectsIncluded} active project
              {currentPlan.projectsIncluded === 1 ? '' : 's'} ·{' '}
              {currentPlan.deliverableProjects >= 999
                ? 'unlimited'
                : currentPlan.deliverableProjects} finished
            </p>
          </div>

          <div className="mt-auto pt-5 flex flex-col gap-2">
            <button
              onClick={() => scrollTo(plansRef)}
              className="w-full px-4 py-2.5 bg-white text-black font-heading font-bold text-xs rounded-lg hover:bg-brand-200 transition-colors"
            >
              {currentTier === 'free' ? 'Choose a plan' : 'Change plan'}
            </button>
            {billing?.has_customer && (
              <button
                onClick={() => void manage()}
                disabled={busy === 'portal'}
                className="w-full px-4 py-2.5 border border-white/15 text-white font-heading text-xs rounded-lg hover:border-white/30 transition-colors disabled:opacity-40"
              >
                {busy === 'portal' ? 'Opening…' : 'Manage billing & invoices'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ---- Offers ---- */}
      <OfferStrip
        demoMode={demoMode}
        onUpgrade={() => scrollTo(plansRef)}
        onCredits={() => scrollTo(packsRef)}
      />

      {/* ---- Buy credits ---- */}
      <div ref={packsRef} className="rounded-2xl border border-white/[0.07] bg-brand-900/20 p-6 scroll-mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">TOP UP CREDITS</h2>
          <p className="text-brand-600 text-[11px] font-body">
            One-off · roll over · never expire · never charged automatically
          </p>
        </div>

        <CreditPackGrid
          packs={livePacks}
          shootCost={shootCost}
          canBuy={canBuy}
          busy={busy}
          onBuy={(id) => void buyCredits(id)}
        />

        {canBuy ? (
          <p className="text-brand-600 text-[11px] font-body mt-4">
            Payment is handled by Stripe — card details never touch Brandscape. Credits land the moment the
            payment clears.
            {billing?.live_mode === false && (
              <span className="text-amber-400"> Test mode: no real money moves.</span>
            )}
          </p>
        ) : (
          <p className="text-brand-500 text-[11px] font-body mt-4">
            Card payment isn&apos;t switched on yet — email{' '}
            <a href="mailto:billing@brandscape.media" className="text-white underline underline-offset-2 hover:text-brand-200">
              billing@brandscape.media
            </a>{' '}
            and we&apos;ll add the credits to your account the same day.
          </p>
        )}
      </div>

      {/* ---- Plans ---- */}
      <div ref={plansRef} className="rounded-2xl border border-white/[0.07] bg-brand-900/20 p-6 scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">PLANS</h2>
          <div className="inline-flex items-center gap-1 bg-brand-950 rounded-full p-1 border border-white/5">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-heading font-semibold transition-colors ${
                !yearly ? 'bg-white text-black' : 'text-brand-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-heading font-semibold transition-colors flex items-center gap-1.5 ${
                yearly ? 'bg-white text-black' : 'text-brand-400 hover:text-white'
              }`}
            >
              Yearly
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${yearly ? 'bg-brand-900 text-brand-300' : 'bg-brand-800 text-brand-500'}`}>
                −19%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentTier
            const monthly = yearly ? Math.round(priceFor(plan.tier, 'year') / 12) : priceFor(plan.tier, 'month')
            const saving = priceFor(plan.tier, 'month') * 12 - priceFor(plan.tier, 'year')
            return (
              <div
                key={plan.tier}
                className={`rounded-xl border p-5 flex flex-col ${
                  isCurrent ? 'border-white/30 bg-white/[0.04]' : 'border-white/10 bg-brand-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-heading font-bold text-sm text-white">{plan.name}</p>
                  {isCurrent && (
                    <span className="text-[9px] font-heading font-bold tracking-widest text-brand-300 px-2 py-0.5 rounded-full bg-white/10">
                      CURRENT
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-heading font-black text-2xl text-white">${monthly.toLocaleString()}</span>
                  <span className="text-brand-600 text-[11px] font-body">/mo</span>
                </div>
                {yearly && saving > 0 && (
                  <p className="text-emerald-400 text-[10px] font-body mt-1">
                    Save ${saving.toLocaleString()} a year
                  </p>
                )}

                <div className="mt-4 space-y-1 text-[11px] font-body text-brand-400">
                  <p>
                    <strong className="text-white">
                      {plan.projectsIncluded >= 999 ? 'Unlimited' : plan.projectsIncluded}
                    </strong>{' '}
                    active projects
                  </p>
                  <p>
                    <strong className="text-white">
                      ~{Math.round(plan.creditsPerMonth / creditsPerProjectShoot)}
                    </strong>{' '}
                    shoots/month
                  </p>
                  <p>
                    <strong className="text-white">
                      {plan.deliverableProjects >= 999 ? 'All' : plan.deliverableProjects}
                    </strong>{' '}
                    taken to final deliverables
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full px-4 py-2.5 border border-white/10 text-brand-500 font-heading font-bold text-[11px] rounded-lg cursor-default"
                    >
                      YOUR PLAN
                    </button>
                  ) : subscribed ? (
                    // Stripe's portal handles proration and downgrade timing
                    // properly; a fresh Checkout session would not.
                    <button
                      onClick={() => void manage()}
                      disabled={!!busy || !canSubscribe}
                      className="w-full px-4 py-2.5 bg-white text-black font-heading font-bold text-[11px] rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40"
                    >
                      {busy === 'portal' ? 'OPENING…' : 'SWITCH'}
                    </button>
                  ) : (
                    <button
                      onClick={() => void buyPlan(plan.tier, yearly ? 'year' : 'month')}
                      disabled={!!busy || !canSubscribe}
                      className="w-full px-4 py-2.5 bg-white text-black font-heading font-bold text-[11px] rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40"
                    >
                      {busy === plan.tier
                        ? 'OPENING…'
                        : billing?.has_trialed === false
                          ? `START ${billing?.trial_days ?? 7}-DAY TRIAL`
                          : 'SUBSCRIBE'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!canSubscribe && !demoMode && (
          <p className="text-brand-500 text-[11px] font-body mt-4">
            Card payment isn&apos;t switched on yet — email{' '}
            <a href="mailto:billing@brandscape.media" className="text-white underline underline-offset-2 hover:text-brand-200">
              billing@brandscape.media
            </a>{' '}
            to change plan.
          </p>
        )}
        {billing?.has_trialed === false && canSubscribe && (
          <p className="text-brand-600 text-[11px] font-body mt-4">
            Your trial runs {billing?.trial_days ?? 7} days. Nothing is charged until it ends, and cancelling
            before then costs nothing. One trial per agency.
          </p>
        )}
      </div>

      {/* ---- Usage + history ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-white/[0.07] bg-brand-900/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">THIS MONTH</h2>
            <span className="text-brand-600 text-[10px] font-heading tracking-wider uppercase">
              {currentPlan.name}
            </span>
          </div>
          <UsageMeters data={data} />
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-brand-900/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-xs text-brand-300 tracking-wider">CREDIT ACTIVITY</h2>
            {burn && (
              <span className="text-brand-600 text-[10px] font-body">
                {Math.round(burn.perDay)}/day over {burn.daysCovered} day{burn.daysCovered === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {/* 14-day spend sparkline */}
          {sparkline.some((v) => v > 0) && (
            <div className="flex items-end gap-1 h-16 mb-5">
              {sparkline.map((v, i) => {
                const max = Math.max(...sparkline)
                return (
                  <div
                    key={i}
                    title={`${v} credits`}
                    className="flex-1 bg-white/25 hover:bg-white/50 rounded-sm transition-colors min-h-[2px]"
                    style={{ height: `${max > 0 ? (v / max) * 100 : 0}%` }}
                  />
                )
              })}
            </div>
          )}

          {ledger.length === 0 ? (
            <p className="text-brand-600 text-xs font-body">
              Nothing spent yet. Credit movements show up here as you generate.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {ledger.slice(0, 40).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="text-brand-300 text-[11px] font-body truncate capitalize">
                      {entry.kind === 'talkinghead' ? 'talking head' : entry.kind}
                      {entry.reason ? <span className="text-brand-600"> · {entry.reason}</span> : null}
                    </p>
                    <p className="text-brand-700 text-[10px] font-body">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`font-heading text-xs shrink-0 ${
                      entry.delta < 0 ? 'text-brand-400' : 'text-emerald-400'
                    }`}
                  >
                    {entry.delta > 0 ? '+' : ''}
                    {entry.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Its own component, not an inline hook call: the page returns early while
 * loading, so calling useCountUp in the main body would change hook order
 * between renders.
 */
function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>
}

function StatusBanner({
  tier,
  trialing,
  trialDaysLeft,
  pastDue,
  outOfCredits,
  lowCredits,
  creditsLeft,
  shootCost,
  resetDays,
  onUpgrade,
  onCredits,
  onManage,
}: {
  tier: PlanTier
  trialing: boolean
  trialDaysLeft: number | null
  pastDue: boolean
  outOfCredits: boolean
  lowCredits: boolean
  creditsLeft: number
  shootCost: number
  resetDays: number
  onUpgrade: () => void
  onCredits: () => void
  onManage: () => void
}) {
  // Most urgent wins — never stack these.
  if (pastDue) {
    return (
      <Banner tone="red" title="Your last payment didn't go through">
        <p>
          Stripe will retry, but your plan will lapse if it keeps failing. Updating your card takes a
          minute and fixes it.
        </p>
        <BannerButton onClick={onManage}>Update card</BannerButton>
      </Banner>
    )
  }

  if (tier === 'free') {
    return (
      <Banner tone="violet" title="No active subscription">
        <p>
          Everything you&apos;ve already made stays here, readable and downloadable. Subscribe to start
          generating again.
        </p>
        <BannerButton onClick={onUpgrade}>Choose a plan</BannerButton>
      </Banner>
    )
  }

  if (outOfCredits) {
    return (
      <Banner tone="red" title="You're out of credits">
        <p>
          Renders are paused until you top up, or until the allowance resets in {resetDays} day
          {resetDays === 1 ? '' : 's'}. Nothing you&apos;ve made is affected.
        </p>
        <BannerButton onClick={onCredits}>Buy credits</BannerButton>
      </Banner>
    )
  }

  if (trialing && trialDaysLeft !== null) {
    return (
      <Banner
        tone="amber"
        title={
          trialDaysLeft === 0
            ? 'Your trial ends today'
            : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your trial`
        }
      >
        <p>
          Your card is charged when the trial ends. Cancel before then and you pay nothing — two clicks
          from Manage billing.
        </p>
        <BannerButton onClick={onManage}>Manage billing</BannerButton>
      </Banner>
    )
  }

  if (lowCredits) {
    return (
      <Banner tone="amber" title="Not enough left for a full shoot">
        <p>
          {creditsLeft.toLocaleString()} credits remain and a complete project needs about {shootCost}.
          The allowance resets in {resetDays} day{resetDays === 1 ? '' : 's'}.
        </p>
        <BannerButton onClick={onCredits}>Top up</BannerButton>
      </Banner>
    )
  }

  return null
}

const TONES = {
  red: 'border-red-500/25 bg-red-500/[0.07]',
  amber: 'border-amber-500/25 bg-amber-500/[0.06]',
  violet: 'border-violet-400/25 bg-violet-500/[0.07]',
} as const

const TITLE_TONES = {
  red: 'text-red-400',
  amber: 'text-amber-400',
  violet: 'text-violet-300',
} as const

function Banner({
  tone,
  title,
  children,
}: {
  tone: keyof typeof TONES
  title: string
  children: React.ReactNode
}) {
  const [body, button] = Array.isArray(children) ? children : [children, null]
  return (
    <div className={`rounded-xl border px-5 py-4 ${TONES[tone]}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`font-heading font-bold text-sm mb-1 ${TITLE_TONES[tone]}`}>{title}</p>
          <div className="text-brand-300 text-xs font-body leading-relaxed">{body}</div>
        </div>
        {button}
      </div>
    </div>
  )
}

function BannerButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-4 py-2 bg-white text-black font-heading font-bold text-[11px] rounded-lg hover:bg-brand-200 transition-colors"
    >
      {children}
    </button>
  )
}
