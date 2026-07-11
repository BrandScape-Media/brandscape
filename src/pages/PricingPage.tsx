import { useState } from 'react'
import { Link } from 'react-router-dom'
import { plans } from '../data/plans'

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)

  return (
    <>
      <div className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="font-heading text-xs tracking-[0.3em] uppercase text-brand-500 mb-4 block">
              Pricing
            </span>
            <h1 className="font-heading font-black text-5xl md:text-6xl tracking-tight mb-6">
              Simple, Transparent
              <br />
              Pricing
            </h1>
            <p className="font-body text-brand-400 max-w-xl mx-auto mb-10 text-lg">
              Choose the plan that matches your agency&apos;s scale.
              14-day free trial on every plan. No credit card required.
            </p>

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

          {/* Plans Grid with Glow */}
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-white/[0.03] rounded-full blur-[200px] pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start relative z-10">
            {plans.map((plan) => (
              <PlanCard key={plan.tier} plan={plan} yearly={yearly} />
            ))}
            </div>
          </div>

          {/* Guarantee */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 border border-white/5 rounded-xl bg-brand-900/20">
              <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-brand-400 text-sm font-body">
                14-day free trial &middot; Cancel anytime &middot; No hidden fees
              </span>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-32 max-w-2xl mx-auto">
            <h2 className="font-heading font-bold text-2xl text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              <FaqItem
                question="What happens when I exceed my generation limit?"
                answer="You can upgrade your plan at any time. Unused generations don&apos;t roll over to the next month, and we&apos;ll never charge you extra without your explicit consent."
              />
              <FaqItem
                question="How does GPU usage work?"
                answer="Image and video generation runs on rented GPU infrastructure via Runpod. All GPU costs are included in your plan — no surprise bills, no per-generation fees."
              />
              <FaqItem
                question="Can my clients access their assets?"
                answer="Every project has a client-accessible library where final assets are delivered with custom metadata, download options, and organized by campaign."
              />
              <FaqItem
                question="What if I need custom AI workflows?"
                answer="Our Enterprise plan includes custom workflow design. We&apos;ll tailor the AI pipeline, system prompts, and ComfyUI workflows to your agency&apos;s specific processes."
              />
              <FaqItem
                question="Can I switch plans mid-cycle?"
                answer="Absolutely. Upgrades are immediate and prorated. Downgrades take effect at the start of your next billing cycle so you don&apos;t lose access."
              />
              <FaqItem
                question="What AI models power the platform?"
                answer="Each stage uses specialized models: dedicated LLMs for research, ideation, strategy, and scripting. Visual generation runs on ComfyUI workflows with custom LoRAs for brand consistency."
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

function PlanCard({ plan, yearly }: { plan: typeof plans[0]; yearly: boolean }) {
  const price = yearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly

  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
        plan.isRecommended
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
        <h3 className={`font-heading font-bold text-lg ${plan.isRecommended ? 'text-black' : 'text-white'}`}>
          {plan.name}
        </h3>
        <p className={`text-sm mt-1.5 font-body leading-relaxed ${plan.isRecommended ? 'text-brand-600' : 'text-brand-500'}`}>
          {plan.description}
        </p>
      </div>

      <div className="mb-8 pb-8 border-b border-white/10">
        <div className="flex items-baseline gap-1">
          <span className={`font-heading font-black text-5xl ${plan.isRecommended ? 'text-black' : 'text-white'}`}>
            ${price}
          </span>
          <span className={`text-sm font-body ${plan.isRecommended ? 'text-brand-600' : 'text-brand-500'}`}>
            /month
          </span>
        </div>
        {yearly && (
          <p className={`text-xs mt-2 font-body ${plan.isRecommended ? 'text-brand-500' : 'text-brand-600'}`}>
            ${plan.priceYearly}/year, billed annually
          </p>
        )}
        {!yearly && (
          <p className={`text-xs mt-2 font-body ${plan.isRecommended ? 'text-brand-500' : 'text-brand-600'}`}>
            Billed monthly
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <svg
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                feature.included
                  ? plan.isRecommended
                    ? 'text-black'
                    : 'text-white'
                  : 'text-brand-700'
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
                ? plan.isRecommended
                  ? 'text-brand-800'
                  : 'text-brand-300'
                : plan.isRecommended
                  ? 'text-brand-300'
                  : 'text-brand-600'
            }`}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <Link
        to="/signup"
        className={`block text-center px-6 py-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all duration-300 ${
          plan.isRecommended
            ? 'bg-black text-white hover:bg-brand-900 hover:shadow-lg'
            : 'bg-white text-black hover:bg-brand-200'
        }`}
      >
        START FREE TRIAL
      </Link>
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
          <img src="/logo-light.png" alt="Brandscape" className="h-6" />
          <p className="text-brand-700 text-xs font-body">
            &copy; {new Date().getFullYear()} Brandscape. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
