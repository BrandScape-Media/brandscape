import { useEffect, useState } from 'react'
import { getOffers } from '../../lib/orchestrator'
import type { Promotion } from '../../types'

/**
 * Marketing offers, resolved server-side for this agency's audience.
 *
 * Dismissals live in localStorage keyed by promotion id — a dismissed offer
 * should stay dismissed across reloads, but there's no reason to spend a
 * database write on it. Non-dismissible offers ignore the store entirely.
 */

const DISMISS_KEY = 'brandscape:dismissed-offers'

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function pushDismissed(id: string) {
  try {
    const next = [...new Set([...readDismissed(), id])]
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
  } catch {
    /* storage disabled — the offer simply reappears next load */
  }
}

export default function OfferStrip({
  demoMode,
  onUpgrade,
  onCredits,
}: {
  demoMode: boolean
  onUpgrade: () => void
  onCredits: () => void
}) {
  const [offers, setOffers] = useState<Promotion[]>([])
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  useEffect(() => {
    if (demoMode) return
    getOffers().then(setOffers).catch(() => setOffers([]))
  }, [demoMode])

  const visible = offers.filter((o) => !dismissed.includes(o.id))
  if (visible.length === 0) return null

  const hide = (id: string) => {
    pushDismissed(id)
    setDismissed((d) => [...d, id])
  }

  return (
    <div className="space-y-3">
      {visible.map((offer) => (
        <div
          key={offer.id}
          className="relative rounded-xl border border-violet-400/25 bg-gradient-to-r from-violet-500/[0.08] to-sky-500/[0.05] p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-sm text-white">{offer.headline}</h3>
                {offer.discount_label && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-[10px] font-heading font-bold tracking-wider text-violet-200">
                    {offer.discount_label}
                  </span>
                )}
              </div>
              {offer.body && (
                <p className="text-brand-300 text-xs font-body mt-1.5 leading-relaxed">{offer.body}</p>
              )}
              {offer.stripe_promotion_code && (
                <p className="text-brand-500 text-[11px] font-body mt-2">
                  Use code{' '}
                  <code className="px-1.5 py-0.5 rounded bg-brand-950 border border-white/10 text-white font-mono">
                    {offer.stripe_promotion_code}
                  </code>{' '}
                  at checkout
                </p>
              )}
              {offer.ends_at && (
                <p className="text-brand-600 text-[10px] font-body mt-1.5">
                  Ends {new Date(offer.ends_at).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {offer.cta_label && (
                offer.cta_target === 'url' && offer.cta_url ? (
                  <a
                    href={offer.cta_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white text-black font-heading font-bold text-[11px] rounded-lg hover:bg-brand-200 transition-colors"
                  >
                    {offer.cta_label}
                  </a>
                ) : (
                  <button
                    onClick={offer.cta_target === 'credits' ? onCredits : onUpgrade}
                    className="px-4 py-2 bg-white text-black font-heading font-bold text-[11px] rounded-lg hover:bg-brand-200 transition-colors"
                  >
                    {offer.cta_label}
                  </button>
                )
              )}
              {offer.dismissible && (
                <button
                  onClick={() => hide(offer.id)}
                  aria-label="Dismiss offer"
                  className="p-2 text-brand-600 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
