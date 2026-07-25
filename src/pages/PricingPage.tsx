import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { startCheckout, getPublicOffers } from '../lib/orchestrator'
import {
  plans,
  creditPacks,
  creditWeights,
  creditsPerProjectShoot,
  sharedPipeline,
  sharedFeatures,
} from '../data/plans'
import type { Plan, PlanTier, Promotion } from '../types'

/**
 * The pricing page has one job: explain why a full pipeline costs more than a
 * per-video tool. Per-video tools start around $39; we start at $299, so the
 * seven stages have to be visible on the page rather than buried in a feature
 * list that reads like everyone else's.
 *
 * Each card therefore leads with two numbers people actually plan around —
 * projects, and shoots per month — and lists only what DIFFERS between tiers.
 * Everything shared is stated once, underneath.
 */

/** Credits are an internal unit; agencies think in finished shoots. */
function shootsFor(credits: number) {
  return Math.round(credits / creditsPerProjectShoot)
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)
  const [offers, setOffers] = useState<Promotion[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { user, demoMode } = useAuth()
  const navigate = useNavigate()
  // demo has no Supabase session, so Checkout would fail with a confusing
  // "session expired" — treat it like a logged-out visitor instead
  const canCheckout = !!user && !demoMode

  // public endpoint — safe to call logged out, and quietly returns nothing
  // when billing isn't switched on
  useEffect(() => {
    getPublicOffers().then(setOffers).catch(() => setOffers([]))
  }, [])

  /**
   * Logged out we can't create a Checkout session (there's no agency yet), so
   * carry the choice through signup and resume it on the other side.
   */
  const choose = async (tier: PlanTier) => {
    const interval = yearly ? 'year' : 'month'
    if (!canCheckout) {
      navigate(`/signup?plan=${tier}&interval=${interval}`)
      return
    }
    setBusy(tier)
    setError(null)
    try {
      window.location.href = await startCheckout({ kind: 'subscription', tier, interval })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
      setBusy(null)
    }
  }

  return (
    <>
      <div className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-4 block">
              Pricing
            </span>
            <h1 className="font-heading font-black text-5xl md:text-6xl tracking-tight mb-6">
              One pipeline,
              <br />
              priced by output
            </h1>
            <p className="font-body text-brand-400 max-w-xl mx-auto mb-10 text-lg">
              Every plan runs the complete pipeline — research through to finished creatives.
              What changes is how many campaigns you run and how much you generate.
              Start with a 7-day trial.
            </p>

            {offers.length > 0 && (
              <div className="mb-8 flex flex-wrap justify-center gap-3">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-violet-400/25 bg-violet-500/[0.07]"
                  >
                    <span className="font-heading font-bold text-xs text-violet-300 tracking-wide">
                      {offer.headline}
                    </span>
                    {offer.body && <span className="text-brand-400 text-xs font-body">{offer.body}</span>}
                    {offer.stripe_promotion_code && (
                      <code className="px-2 py-1 rounded bg-brand-950 border border-white/10 text-[11px] text-white font-mono">
                        {offer.stripe_promotion_code}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Toggle */}
            <div className="inline-flex items-center gap-1 bg-brand-900 rounded-full p-1 border border-white/5">
              <button
                onClick={() => setYearly(false)}
                className={`px-6 py-2.5 rounded-full text-sm font-heading font-semibold transition-all duration-300 ${
                  !yearly ? 'bg-white text-black shadow-lg' : 'text-brand-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-heading font-semibold transition-all duration-300 flex items-center gap-2 ${
                  yearly ? 'bg-white text-black shadow-lg' : 'text-brand-400 hover:text-white'
                }`}
              >
                Yearly
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  yearly ? 'bg-brand-900 text-brand-300' : 'bg-brand-800 text-brand-500'
                }`}>
                  SAVE 19%
                </span>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-center text-red-400 text-sm font-body mb-6">{error}</p>
          )}

          {/* Plans Grid with Glow */}
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-white/[0.03] rounded-full blur-[200px] pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start relative z-10">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.tier}
                  plan={plan}
                  yearly={yearly}
                  busy={busy === plan.tier}
                  disabled={!!busy}
                  signedIn={canCheckout}
                  onChoose={() => void choose(plan.tier)}
                />
              ))}
            </div>
          </div>

          {/* Trial terms — stated plainly, right under the buttons */}
          <div className="mt-10 text-center">
            <div className="inline-flex flex-wrap justify-center items-center gap-x-3 gap-y-1 px-6 py-4 border border-white/5 rounded-xl bg-brand-900/20">
              <span className="text-brand-400 text-sm font-body">
                7-day trial &middot; card required, charged when the trial ends &middot; cancel any time before then and you pay nothing
              </span>
            </div>
          </div>

          {/* What every plan includes — the actual argument for the price */}
          <div className="mt-28 max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-3 block">
                On every plan
              </span>
              <h2 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-4">
                The whole pipeline, not one step of it
              </h2>
              <p className="font-body text-brand-400 max-w-2xl mx-auto">
                Most AI video tools start where the thinking has already been done — you arrive
                with a script and leave with a clip. Brandscape runs the seven stages before and
                after that, so a campaign goes from a brand brief to finished creatives without
                leaving the platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sharedPipeline.map((step, i) => (
                <div
                  key={step.stage}
                  className="rounded-xl border border-white/[0.07] bg-brand-900/20 p-5 hover:border-white/15 transition-colors"
                >
                  <span className="font-heading text-[10px] tracking-widest text-brand-600">
                    STAGE {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="font-heading font-bold text-sm text-white mt-2 mb-1.5">{step.stage}</p>
                  <p className="text-brand-500 text-xs font-body leading-relaxed">{step.blurb}</p>
                </div>
              ))}
              <div className="rounded-xl border border-white/[0.07] bg-brand-900/20 p-5 flex flex-col justify-center">
                <ul className="space-y-2">
                  {sharedFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-brand-400 text-[11px] font-body leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Credits — explained honestly, because they can run out */}
          <div className="mt-28 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-3 block">
                How generation is measured
              </span>
              <h2 className="font-heading font-bold text-3xl tracking-tight mb-4">Credits</h2>
              <p className="font-body text-brand-400 max-w-2xl mx-auto">
                Rendering an image costs us a fraction of what rendering a talking-head video
                costs, so one flat &quot;generations&quot; number would be dishonest in both
                directions. Each finished asset spends credits according to what it takes to
                produce. Your plan includes an allowance every month.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {Object.entries(creditWeights).map(([kind, cost]) => (
                <div key={kind} className="rounded-xl border border-white/[0.07] bg-brand-900/20 p-5 text-center">
                  <p className="font-heading font-black text-3xl text-white">{cost}</p>
                  <p className="text-brand-600 text-[10px] font-heading tracking-wider mb-1">
                    CREDIT{cost === 1 ? '' : 'S'}
                  </p>
                  <p className="text-brand-400 text-xs font-body capitalize">
                    {kind === 'broll' ? 'B-roll clip' : kind === 'talkinghead' ? 'Talking head' : kind}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-brand-900/20 p-6 mb-6">
              <p className="text-brand-300 text-sm font-body leading-relaxed">
                A complete campaign shoot — roughly 16 images, 12 voiceover lines and 13 clips —
                comes to about <strong className="text-white">{creditsPerProjectShoot} credits</strong>.
                That is the number worth remembering: Starter covers about{' '}
                {shootsFor(plans[0].creditsPerMonth)} complete shoots a month, Professional about{' '}
                {shootsFor(plans[1].creditsPerMonth)}, Enterprise about {shootsFor(plans[2].creditsPerMonth)}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {creditPacks.map((pack, i) => (
                <div key={pack.id} className="rounded-xl border border-white/[0.07] bg-brand-900/20 p-5">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="font-heading font-bold text-lg text-white">
                      {pack.credits.toLocaleString()}
                    </p>
                    {i === creditPacks.length - 1 && (
                      <span className="text-[9px] font-heading font-bold tracking-widest text-violet-300 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-400/20">
                        BEST RATE
                      </span>
                    )}
                  </div>
                  <p className="text-brand-600 text-[11px] font-body mb-3">extra credits</p>
                  <p className="font-heading font-bold text-white">${pack.priceUsd}</p>
                  <p className="text-brand-600 text-[10px] font-body">
                    ${(pack.priceUsd / pack.credits).toFixed(3)} per credit &middot;{' '}
                    {Math.floor(pack.credits / creditsPerProjectShoot)} more shoot
                    {Math.floor(pack.credits / creditsPerProjectShoot) === 1 ? '' : 's'}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-brand-600 text-xs font-body mt-4 text-center">
              Top-ups are always optional and never automatic — nothing is charged unless you
              choose to buy. Purchased credits roll over and don&apos;t expire.
            </p>
          </div>

          {/* FAQ */}
          <div className="mt-32 max-w-2xl mx-auto">
            <h2 className="font-heading font-bold text-2xl text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              <FaqItem
                question="How does the trial work?"
                answer="Seven days on whichever plan you pick, with full access. We take card details up front and charge nothing until day seven — cancel before then, in two clicks from your billing page, and you're not billed at all. One trial per agency."
              />
              <FaqItem
                question="What happens if I run out of credits?"
                answer="Generation pauses until your allowance resets at the start of the next month, or until you buy a top-up pack. Nothing is charged automatically and nothing you've already made is affected — your projects, media and deliverables stay exactly where they are. We warn you in the dashboard well before you get there."
              />
              <FaqItem
                question="Do unused credits roll over?"
                answer="Your monthly plan allowance doesn't roll over — it resets on the 1st. Credits you buy as top-up packs do roll over and never expire. When you generate, we always spend the monthly allowance first so your purchased credits are never burned while the plan still has room."
              />
              <FaqItem
                question="What if I cancel?"
                answer="Your account stays open and everything you've made stays readable and downloadable — we don't delete your work. Generation stops, and you can resubscribe at any time to pick up where you left off."
              />
              <FaqItem
                question="Can I switch plans mid-cycle?"
                answer="Yes. Upgrades take effect immediately and are prorated, so you only pay the difference for the rest of the cycle. Downgrades take effect at the start of your next billing cycle so you don't lose access you've already paid for."
              />
              <FaqItem
                question="Can my clients access their assets?"
                answer="Every project has a client-facing library where final assets are delivered, organized by campaign, with comments and share links. Your client doesn't need a Brandscape account to view or comment."
              />
              <FaqItem
                question="What if I need custom AI workflows?"
                answer="Enterprise includes custom workflow design — we tailor the generation pipeline and models to your agency's processes and house style, and you get dedicated GPU capacity so large shoots don't queue behind anyone else."
              />
              <FaqItem
                question="What AI models power the platform?"
                answer="Each stage uses models chosen for that job: language models with live web search for research, ideation and scripting, and our own generation pipeline for imagery and video, tuned for brand consistency using your product photography."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <PricingFooter />
    </>
  )
}

function PlanCard({
  plan,
  yearly,
  busy,
  disabled,
  signedIn,
  onChoose,
}: {
  plan: Plan
  yearly: boolean
  busy: boolean
  disabled: boolean
  signedIn: boolean
  onChoose: () => void
}) {
  const price = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly
  const unlimitedProjects = plan.projectsIncluded >= 999
  const light = plan.isRecommended

  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
        light
          ? 'bg-white text-black border-2 border-white shadow-2xl shadow-white/5 scale-[1.02] md:scale-105'
          : 'bg-brand-900/20 border border-white/10 hover:border-white/20'
      }`}
    >
      {plan.isRecommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-[10px] font-heading font-bold tracking-widest rounded-full shadow-lg">
          MOST POPULAR
        </div>
      )}

      <div className="mb-6">
        <h3 className={`font-heading font-bold text-lg ${light ? 'text-black' : 'text-white'}`}>
          {plan.name}
        </h3>
        <p className={`text-sm mt-1.5 font-body leading-relaxed ${light ? 'text-brand-600' : 'text-brand-500'}`}>
          {plan.description}
        </p>
      </div>

      <div className="mb-6 pb-6 border-b border-black/10">
        <div className="flex items-baseline gap-1">
          <span className={`font-heading font-black text-5xl ${light ? 'text-black' : 'text-white'}`}>
            ${price.toLocaleString()}
          </span>
          <span className={`text-sm font-body ${light ? 'text-brand-600' : 'text-brand-500'}`}>
            /month
          </span>
        </div>
        <p className={`text-xs mt-2 font-body ${light ? 'text-brand-500' : 'text-brand-600'}`}>
          {yearly ? `$${plan.priceYearly.toLocaleString()}/year, billed annually` : 'Billed monthly'}
        </p>
      </div>

      {/* The two numbers people actually plan around */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`rounded-xl p-4 ${light ? 'bg-black/[0.04]' : 'bg-white/[0.03]'}`}>
          <p className={`font-heading font-black text-2xl ${light ? 'text-black' : 'text-white'}`}>
            {unlimitedProjects ? '∞' : plan.projectsIncluded}
          </p>
          <p className={`text-[10px] font-heading tracking-wider mt-0.5 ${light ? 'text-brand-600' : 'text-brand-500'}`}>
            ACTIVE PROJECTS
          </p>
        </div>
        <div className={`rounded-xl p-4 ${light ? 'bg-black/[0.04]' : 'bg-white/[0.03]'}`}>
          <p className={`font-heading font-black text-2xl ${light ? 'text-black' : 'text-white'}`}>
            ~{shootsFor(plan.creditsPerMonth)}
          </p>
          <p className={`text-[10px] font-heading tracking-wider mt-0.5 ${light ? 'text-brand-600' : 'text-brand-500'}`}>
            SHOOTS / MONTH
          </p>
        </div>
      </div>
      <p className={`text-[11px] font-body -mt-3 mb-6 ${light ? 'text-brand-500' : 'text-brand-600'}`}>
        {plan.creditsPerMonth.toLocaleString()} generation credits included each month
      </p>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <svg
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                feature.included ? (light ? 'text-black' : 'text-white') : 'text-brand-700'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {feature.included ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span className={`text-sm font-body leading-snug ${
              feature.included
                ? light ? 'text-brand-800' : 'text-brand-300'
                : light ? 'text-brand-300' : 'text-brand-600'
            }`}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onChoose}
        disabled={disabled}
        className={`block w-full text-center px-6 py-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
          light
            ? 'bg-black text-white hover:bg-brand-900 hover:shadow-lg'
            : 'bg-white text-black hover:bg-brand-200'
        }`}
      >
        {busy ? 'OPENING…' : signedIn ? `CHOOSE ${plan.name.toUpperCase()}` : 'START 7-DAY TRIAL'}
      </button>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${open ? 'border-white/15 bg-brand-900/30' : 'border-white/5 hover:border-white/10'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-heading font-semibold text-sm text-brand-200 pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-brand-500 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1">
          <p className="text-brand-400 text-sm font-body leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

function PricingFooter() {
  return (
    <footer className="bg-brand-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <img src="/logo-dark.png" alt="Brandscape" className="h-6" />
          <p className="text-brand-700 text-xs font-body">
            &copy; {new Date().getFullYear()} Brandscape. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
