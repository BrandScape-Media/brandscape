import { useState } from 'react'
import { updateProject } from '../../lib/api'
import type { DiscoveryData } from '../../types'

/**
 * Edits the Discovery brief (the structured campaign inputs). Discovery
 * isn't AI-generated text, so it can't use the markdown editor — this form
 * edits discovery_data directly and saves it, preserving fields it doesn't
 * expose (avatar prefs, platforms, links, dates…).
 */
export default function DiscoveryEditor({
  projectId,
  discovery,
  onClose,
  onSaved,
}: {
  projectId: string
  discovery: DiscoveryData | null | undefined
  onClose: () => void
  onSaved: () => void
}) {
  const d = discovery ?? {}
  const [form, setForm] = useState({
    product: d.product ?? '',
    objective: d.objective ?? '',
    target_audience: d.target_audience ?? '',
    competition: d.competition ?? '',
    pain_points: d.pain_points ?? '',
    usps: (d.usps ?? []).join('\n'),
    motto: d.motto ?? '',
    messaging: d.messaging ?? '',
    brand_guidelines: d.brand_guidelines ?? '',
    notes: d.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateProject(projectId, {
        discovery_data: {
          ...d, // keep platforms, social_links, budget, deadline, avatar_prefs…
          product: form.product,
          objective: form.objective,
          target_audience: form.target_audience,
          competition: form.competition,
          pain_points: form.pain_points,
          usps: form.usps.split('\n').map((s) => s.trim()).filter(Boolean),
          motto: form.motto,
          messaging: form.messaging,
          brand_guidelines: form.brand_guidelines,
          notes: form.notes,
        },
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the brief.')
      setSaving(false)
    }
  }

  const input =
    'w-full px-3.5 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors'
  const Field = ({ label, k, rows, placeholder }: { label: string; k: keyof typeof form; rows?: number; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-heading text-brand-500 mb-1.5">{label}</label>
      {rows ? (
        <textarea value={form[k]} onChange={(e) => set(k, e.target.value)} rows={rows} placeholder={placeholder} className={`${input} resize-none`} />
      ) : (
        <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className={input} />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-brand-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-950 border border-white/10 rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-lg">Edit Discovery Brief</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 text-brand-300 hover:text-white hover:border-white/30 flex items-center justify-center transition-colors">✕</button>
        </div>
        <div className="space-y-4">
          <Field label="Product / Service" k="product" placeholder="What are we promoting?" />
          <Field label="Campaign Objective" k="objective" />
          <Field label="Target Audience" k="target_audience" rows={3} />
          <Field label="Key Competitors" k="competition" rows={2} />
          <Field label="Pain Points the Product Solves" k="pain_points" rows={3} />
          <Field label="USPs (one per line)" k="usps" rows={3} />
          <Field label="Motto / Tagline" k="motto" />
          <Field label="Specific Messaging" k="messaging" rows={2} />
          <Field label="Brand Guidelines" k="brand_guidelines" rows={3} />
          <Field label="Notes" k="notes" rows={2} />
          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} disabled={saving} className="px-5 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 transition-colors disabled:opacity-40">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Save Brief'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
