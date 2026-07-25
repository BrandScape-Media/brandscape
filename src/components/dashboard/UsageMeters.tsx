import type { UsageSnapshot } from '../../types'

/**
 * The non-credit meters. Extracted from the old UsagePanel so the Billing
 * page and anything else that needs them share one implementation.
 *
 * These are guardrails rather than the thing that stops work — credits are
 * the meter that actually gates spend — so they live below the fold.
 */

export const UNLIMITED = 999_999

export function pct(used: number, limit: number) {
  if (limit >= UNLIMITED || limit <= 0) return limit <= 0 ? 100 : 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function toneFor(percent: number) {
  if (percent >= 100) return { bar: 'bg-red-500', text: 'text-red-400' }
  if (percent >= 80) return { bar: 'bg-amber-500', text: 'text-amber-400' }
  return { bar: 'bg-white/70', text: 'text-brand-400' }
}

/** Days until the counters roll over (they reset on the 1st, UTC). */
export function daysToReset(): number {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 86_400_000))
}

export function Meter({ label, hint, used, limit, resets = true, atLimit }: {
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
  const none = limit <= 0
  const percent = pct(used, limit)
  const tone = toneFor(percent)
  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <p className="text-brand-300 text-xs font-heading">{label}</p>
          <p className="text-brand-700 text-[10px] font-body truncate">{hint}</p>
        </div>
        <p className={`text-xs font-heading shrink-0 ${none ? 'text-brand-600' : tone.text}`}>
          {unlimited
            ? `${used.toLocaleString()} · unlimited`
            : none
              ? 'not included'
              : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </p>
      </div>
      <div className="h-1.5 bg-brand-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${unlimited ? 'bg-white/20' : none ? 'bg-brand-700' : tone.bar}`}
          style={{ width: `${unlimited ? 4 : none ? 100 : percent}%` }}
        />
      </div>
      {!unlimited && !none && percent >= 80 && (
        <p className={`mt-1 text-[10px] font-body ${tone.text}`}>
          {percent >= 100
            ? atLimit ?? 'Limit reached — resets on the 1st.'
            : `${limit - used} left${resets ? ' this month' : ''}.`}
        </p>
      )}
    </div>
  )
}

export default function UsageMeters({ data }: { data: UsageSnapshot }) {
  const m = data.meters
  return (
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
  )
}
