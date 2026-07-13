import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useClients } from '../../hooks/useData'
import { createProject } from '../../lib/api'

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { user, demoMode } = useAuth()
  const { data: clients, loading: clientsLoading } = useClients()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    projectName: '',
    clientId: '',
    budget: '',
    timeline: '',
    goals: '',
    targetAudience: '',
    competition: '',
    brandGuidelines: '',
    notes: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => setStep((s) => Math.min(s + 1, 3))
  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    if (demoMode) {
      setError('Demo mode is read-only — sign in with a real account to create projects.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const project = await createProject(user!.agency_id!, {
        name: formData.projectName.trim(),
        client_id: formData.clientId,
        discovery_data: {
          budget: formData.budget,
          timeline: formData.timeline,
          goals: formData.goals,
          target_audience: formData.targetAudience,
          competition: formData.competition,
          brand_guidelines: formData.brandGuidelines,
          notes: formData.notes,
        },
      })
      navigate(`/dashboard/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="text-brand-500 hover:text-white text-sm font-heading mb-4 inline-block transition-colors"
        >
          &larr; Back to Projects
        </button>
        <h1 className="font-heading font-bold text-2xl">New Project</h1>
        <p className="text-brand-500 text-sm font-body mt-1">
          Fill in the discovery details to kick off the AI pipeline.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-heading font-bold ${
                s === step
                  ? 'bg-white text-black'
                  : s < step
                    ? 'bg-green-500 text-white'
                    : 'bg-brand-800 text-brand-500'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            <span className={`text-sm font-heading hidden sm:inline ${
              s === step ? 'text-white' : 'text-brand-600'
            }`}>
              {s === 1 ? 'Basics' : s === 2 ? 'Client Info' : 'Brand Details'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-brand-800 hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 space-y-5">
          <h2 className="font-heading font-bold text-lg">Project Basics</h2>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="e.g., Nike — Summer 2024 Campaign"
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Client *
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => updateField('clientId', e.target.value)}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="">{clientsLoading ? 'Loading clients…' : 'Select a client...'}</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!clientsLoading && (clients?.length ?? 0) === 0 && (
              <p className="text-brand-600 text-xs font-body mt-2">
                No clients yet — <Link to="/dashboard/clients" className="text-brand-400 hover:text-white underline transition-colors">add one first</Link>.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Budget Range
            </label>
            <select
              value={formData.budget}
              onChange={(e) => updateField('budget', e.target.value)}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors"
            >
              <option value="">Select budget range...</option>
              <option value="small">&lt; $10,000</option>
              <option value="medium">$10,000 - $50,000</option>
              <option value="large">$50,000 - $100,000</option>
              <option value="enterprise">$100,000+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Timeline
            </label>
            <input
              type="text"
              value={formData.timeline}
              onChange={(e) => updateField('timeline', e.target.value)}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="e.g., 4 weeks, deadline July 30"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleNext}
              disabled={!formData.projectName || !formData.clientId}
              className="px-6 py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Client Info */}
      {step === 2 && (
        <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 space-y-5">
          <h2 className="font-heading font-bold text-lg">Client Information</h2>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Project Goals *
            </label>
            <textarea
              value={formData.goals}
              onChange={(e) => updateField('goals', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="What are the main objectives? Brand awareness, lead generation, product launch..."
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Target Audience *
            </label>
            <textarea
              value={formData.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="Describe the target demographic, psychographics, key behaviors..."
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Key Competitors
            </label>
            <textarea
              value={formData.competition}
              onChange={(e) => updateField('competition', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="List competitors, their social handles, notable campaigns..."
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-white/20 text-white font-heading font-semibold text-sm tracking-wide rounded-lg hover:border-white/40 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!formData.goals || !formData.targetAudience}
              className="px-6 py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Brand Details */}
      {step === 3 && (
        <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 space-y-5">
          <h2 className="font-heading font-bold text-lg">Brand & Guidelines</h2>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Brand Voice & Guidelines
            </label>
            <textarea
              value={formData.brandGuidelines}
              onChange={(e) => updateField('brandGuidelines', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="Describe the brand voice, tone, visual style preferences, any do&apos;s and don&apos;ts..."
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="Any other context, references, or special requirements..."
            />
          </div>

          {/* Summary */}
          <div className="bg-brand-900 rounded-xl p-5 border border-white/5">
            <h3 className="font-heading font-semibold text-sm text-brand-300 mb-3">Project Summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-600">Project</dt>
                <dd className="text-white font-heading">{formData.projectName || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-600">Budget</dt>
                <dd className="text-white font-heading">{formData.budget || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-600">Timeline</dt>
                <dd className="text-white font-heading">{formData.timeline || '—'}</dd>
              </div>
            </dl>
          </div>

          {error && (
            <p className="text-red-400 text-xs font-body bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-white/20 text-white font-heading font-semibold text-sm tracking-wide rounded-lg hover:border-white/40 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'CREATING…' : 'LAUNCH AI PIPELINE'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
