import { useEffect, useState } from 'react'
import { adminListPromotions, adminSavePromotion, adminDeletePromotion } from '../../lib/orchestrator'
import type { Promotion } from '../../types'

/**
 * Staff editor for the offers shown in the dashboard and on the pricing page.
 *
 * Discounts themselves live in Stripe (coupons + promotion codes) — this only
 * controls what is SHOWN, to whom, and when, so the label here and the money
 * there can never be edited into disagreeing. `discount_label` is copy;
 * `stripe_promotion_code` is the code that actually reduces the price.
 */

const AUDIENCES: Promotion['audience'][] = [
  'all',
  'trialing',
  'free',
  'solo',
  'starter',
  'professional',
  'low_credits',
  'out_of_credits',
]

const AUDIENCE_HINTS: Record<Promotion['audience'], string> = {
  all: 'Everyone',
  trialing: 'Currently in their 7-day trial',
  free: 'No subscription (pre-trial or lapsed)',
  solo: 'On Solo — the entry tier',
  starter: 'On Starter — the upgrade nudge',
  professional: 'On Professional',
  low_credits: 'Less than one full shoot left',
  out_of_credits: 'Completely out of credits',
}

const PLACEMENTS: Promotion['placement'][] = ['dashboard', 'pricing', 'both']

const BLANK: Partial<Promotion> = {
  slug: '',
  headline: '',
  body: '',
  cta_label: '',
  cta_target: 'upgrade',
  cta_url: '',
  audience: 'all',
  placement: 'dashboard',
  stripe_promotion_code: '',
  discount_label: '',
  starts_at: null,
  ends_at: null,
  active: true,
  dismissible: true,
  priority: 0,
}

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`, not an ISO string with a zone. */
function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminOffers() {
  const [offers, setOffers] = useState<Promotion[]>([])
  const [draft, setDraft] = useState<Partial<Promotion>>(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    adminListPromotions()
      .then(setOffers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load offers.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const set = <K extends keyof Promotion>(key: K, value: Promotion[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const save = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await adminSavePromotion(draft)
      setNotice(`Saved "${draft.slug}".`)
      setDraft(BLANK)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (offer: Promotion) => {
    setError(null)
    try {
      await adminDeletePromotion(offer.id)
      setNotice(`Deleted "${offer.slug}".`)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.')
    }
  }

  const isLive = (o: Promotion) => {
    const now = Date.now()
    if (!o.active) return false
    if (o.starts_at && new Date(o.starts_at).getTime() > now) return false
    if (o.ends_at && new Date(o.ends_at).getTime() < now) return false
    return true
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg">
          <p className="text-red-400 text-xs font-body">{error}</p>
        </div>
      )}
      {notice && (
        <div className="px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
          <p className="text-blue-300 text-xs font-body">{notice}</p>
        </div>
      )}

      {/* Editor */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6">
        <h3 className="font-heading font-bold text-sm mb-1">
          {offers.some((o) => o.slug === draft.slug) ? 'Update offer' : 'New offer'}
        </h3>
        <p className="text-brand-600 text-[11px] font-body mb-5">
          Saving reuses the slug, so editing an existing one just overwrites it.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Slug" hint="Unique id, e.g. founding-agency">
            <input
              value={draft.slug ?? ''}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="founding-agency"
              className={inputClass}
            />
          </Field>
          <Field label="Headline" hint="Shown in bold">
            <input
              value={draft.headline ?? ''}
              onChange={(e) => set('headline', e.target.value)}
              placeholder="Founding agency offer"
              className={inputClass}
            />
          </Field>

          <Field label="Body" hint="One or two sentences" wide>
            <textarea
              value={draft.body ?? ''}
              onChange={(e) => set('body', e.target.value)}
              rows={2}
              placeholder="20% off your first three months on any plan."
              className={inputClass}
            />
          </Field>

          <Field label="Audience" hint={AUDIENCE_HINTS[draft.audience ?? 'all']}>
            <select
              value={draft.audience ?? 'all'}
              onChange={(e) => set('audience', e.target.value as Promotion['audience'])}
              className={inputClass}
            >
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Placement" hint="Where it appears">
            <select
              value={draft.placement ?? 'dashboard'}
              onChange={(e) => set('placement', e.target.value as Promotion['placement'])}
              className={inputClass}
            >
              {PLACEMENTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>

          <Field label="Button label" hint="Leave blank for no button">
            <input
              value={draft.cta_label ?? ''}
              onChange={(e) => set('cta_label', e.target.value)}
              placeholder="See plans"
              className={inputClass}
            />
          </Field>
          <Field label="Button goes to" hint="Plans, credit packs, or a link">
            <select
              value={draft.cta_target ?? 'upgrade'}
              onChange={(e) => set('cta_target', e.target.value as Promotion['cta_target'])}
              className={inputClass}
            >
              <option value="upgrade">Plans</option>
              <option value="credits">Credit packs</option>
              <option value="url">External URL</option>
            </select>
          </Field>

          {draft.cta_target === 'url' && (
            <Field label="URL" hint="Opens in a new tab" wide>
              <input
                value={draft.cta_url ?? ''}
                onChange={(e) => set('cta_url', e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Stripe promotion code" hint="The code customers type at checkout">
            <input
              value={draft.stripe_promotion_code ?? ''}
              onChange={(e) => set('stripe_promotion_code', e.target.value)}
              placeholder="FOUNDING20"
              className={inputClass}
            />
          </Field>
          <Field label="Discount label" hint="Display only — Stripe owns the real number">
            <input
              value={draft.discount_label ?? ''}
              onChange={(e) => set('discount_label', e.target.value)}
              placeholder="20% OFF"
              className={inputClass}
            />
          </Field>

          <Field label="Starts" hint="Blank = live immediately">
            <input
              type="datetime-local"
              value={toLocalInput(draft.starts_at)}
              onChange={(e) => set('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
              className={inputClass}
            />
          </Field>
          <Field label="Ends" hint="Blank = permanent">
            <input
              type="datetime-local"
              value={toLocalInput(draft.ends_at)}
              onChange={(e) => set('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
              className={inputClass}
            />
          </Field>

          <Field label="Priority" hint="Highest shows first">
            <input
              type="number"
              value={draft.priority ?? 0}
              onChange={(e) => set('priority', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Flags" hint="Active offers are served; dismissible ones can be hidden">
            <div className="flex items-center gap-5 pt-2">
              <label className="flex items-center gap-2 text-xs font-body text-brand-300">
                <input
                  type="checkbox"
                  checked={draft.active !== false}
                  onChange={(e) => set('active', e.target.checked)}
                  className="accent-violet-400"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-xs font-body text-brand-300">
                <input
                  type="checkbox"
                  checked={draft.dismissible !== false}
                  onChange={(e) => set('dismissible', e.target.checked)}
                  className="accent-violet-400"
                />
                Dismissible
              </label>
            </div>
          </Field>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => void save()}
            disabled={saving || !draft.slug?.trim() || !draft.headline?.trim()}
            className="px-5 py-2.5 bg-white text-black font-heading font-bold text-xs rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save offer'}
          </button>
          {draft.slug && (
            <button
              onClick={() => setDraft(BLANK)}
              className="px-4 py-2.5 border border-white/15 text-brand-300 font-heading text-xs rounded-lg hover:border-white/30 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6">
        <h3 className="font-heading font-bold text-sm mb-4">All offers</h3>
        {loading ? (
          <div className="h-20 bg-brand-900/40 rounded-lg animate-pulse" />
        ) : offers.length === 0 ? (
          <p className="text-brand-600 text-xs font-body">
            No offers yet. The annual-billing discount is built into the pricing page already — add
            something here when you want a time-boxed campaign or a trial nudge.
          </p>
        ) : (
          <div className="space-y-2">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-brand-900/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isLive(offer) ? 'bg-emerald-400' : 'bg-brand-700'}`}
                      title={isLive(offer) ? 'Live' : 'Not live'}
                    />
                    <p className="font-heading font-semibold text-xs text-white truncate">{offer.headline}</p>
                    <span className="text-[10px] font-mono text-brand-600">{offer.slug}</span>
                  </div>
                  <p className="text-brand-600 text-[10px] font-body mt-1">
                    {offer.audience} · {offer.placement} · priority {offer.priority}
                    {offer.stripe_promotion_code && ` · code ${offer.stripe_promotion_code}`}
                    {offer.ends_at && ` · ends ${new Date(offer.ends_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDraft(offer)}
                    className="px-3 py-1.5 border border-white/15 text-brand-300 font-heading text-[11px] rounded-lg hover:border-white/30 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void remove(offer)}
                    className="px-3 py-1.5 border border-red-500/25 text-red-400 font-heading text-[11px] rounded-lg hover:border-red-500/50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 bg-brand-950 border border-white/10 rounded-lg text-white text-xs font-body focus:outline-none focus:border-white/30 transition-colors'

function Field({
  label,
  hint,
  wide,
  children,
}: {
  label: string
  hint?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={wide ? 'md:col-span-2' : undefined}>
      <label className="block font-heading font-semibold text-[11px] text-brand-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-brand-700 text-[10px] font-body mt-1">{hint}</p>}
    </div>
  )
}
