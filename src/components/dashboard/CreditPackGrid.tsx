import { creditsPerProjectShoot } from '../../data/plans'
import type { CreditPack } from '../../types'

/**
 * Top-up packs. Shown as what they buy — extra shoots — with the per-credit
 * rate stated so the volume discount is visible rather than implied.
 *
 * `canBuy` is false when Stripe isn't configured; the caller shows the
 * email fallback instead of dead buttons.
 */
export default function CreditPackGrid({
  packs,
  shootCost = creditsPerProjectShoot,
  canBuy,
  busy,
  onBuy,
}: {
  packs: CreditPack[]
  shootCost?: number
  canBuy: boolean
  busy: string | null
  onBuy: (packId: string) => void
}) {
  // cheapest per credit wins the badge — computed, not hardcoded, so it stays
  // correct if the packs are ever repriced
  const bestRate = packs.reduce<string | null>((best, p) => {
    if (!best) return p.id
    const bestPack = packs.find((x) => x.id === best)!
    return p.priceUsd / p.credits < bestPack.priceUsd / bestPack.credits ? p.id : best
  }, null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {packs.map((pack) => {
        const shoots = Math.floor(pack.credits / (shootCost || 150))
        const isBest = pack.id === bestRate
        return (
          <div
            key={pack.id}
            className={`relative rounded-xl border p-5 flex flex-col transition-colors ${
              isBest
                ? 'border-violet-400/30 bg-violet-500/[0.05] hover:border-violet-400/50'
                : 'border-white/10 bg-brand-900/40 hover:border-white/20'
            }`}
          >
            {isBest && (
              <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-[9px] font-heading font-bold tracking-widest text-violet-200">
                BEST RATE
              </span>
            )}
            <p className="font-heading font-black text-2xl text-white">{pack.credits.toLocaleString()}</p>
            <p className="text-brand-500 text-[11px] font-body">credits</p>

            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <p className="font-heading font-bold text-lg text-white">${pack.priceUsd}</p>
              <p className="text-brand-600 text-[10px] font-body mt-0.5">
                ${(pack.priceUsd / pack.credits).toFixed(3)} per credit
              </p>
              <p className="text-brand-500 text-[11px] font-body mt-1">
                ≈ {shoots} more full shoot{shoots === 1 ? '' : 's'}
              </p>
            </div>

            {canBuy && (
              <button
                onClick={() => onBuy(pack.id)}
                disabled={!!busy}
                className="mt-4 w-full px-3 py-2.5 bg-white text-black font-heading font-bold text-[11px] rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === pack.id ? 'OPENING…' : 'BUY'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
