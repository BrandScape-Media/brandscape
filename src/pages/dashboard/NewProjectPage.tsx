import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAgency, useClients, useProjects } from '../../hooks/useData'
import { createProject, uploadClientAsset } from '../../lib/api'
import { listInfluencersForAgency, type AgencyInfluencer } from '../../lib/orchestrator'
import { plans } from '../../data/plans'
import type { AvatarPrefs } from '../../types'

const OBJECTIVES = [
  'Brand awareness',
  'Engagement & community',
  'Conversions / sales',
  'Lead generation',
  'App installs',
  'Product launch',
  'UGC-style content',
]

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook', 'LinkedIn', 'X / Twitter']

const inputCls =
  'w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors'

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { user, demoMode } = useAuth()
  const { data: clients, loading: clientsLoading } = useClients()
  const { data: projects } = useProjects()
  const { data: agency } = useAgency()
  const plan = plans.find((p) => p.tier === agency?.plan) ?? plans[0]
  const activeCount = (projects ?? []).filter((p) => !p.archived).length
  const atProjectLimit = !demoMode && activeCount >= plan.projectsIncluded
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // the presenter/avatar block is collapsed by default — most briefs let the
  // AI cast, so it opens on demand
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [formData, setFormData] = useState({
    projectName: '',
    clientId: '',
    product: '',
    objective: '',
    platforms: [] as string[],
    budget: '',
    deadline: '',
    socialLinks: '',
    targetAudience: '',
    competition: '',
    painPoints: '',
    usps: ['', '', '', '', ''],
    motto: '',
    messaging: '',
    brandGuidelines: '',
    notes: '',
    avatarGender: 'any',
    avatarAge: 'any',
    avatarTags: '',
    pinnedInfluencerId: '',
  })
  // Cast picker roster — empty in demo mode or while the API is unreachable
  const [influencers, setInfluencers] = useState<AgencyInfluencer[]>([])
  useEffect(() => {
    if (demoMode) return
    listInfluencersForAgency().then(setInfluencers).catch(() => undefined)
  }, [demoMode])

  // Product photos upload straight to the selected client's library — the
  // generation pipeline shoots from them. A client can have several (e.g. a
  // jewelry brand's earrings, rings and necklaces).
  const [productUploads, setProductUploads] = useState<
    { name: string; status: 'uploading' | 'done' | 'error'; message?: string }[]
  >([])
  useEffect(() => setProductUploads([]), [formData.clientId])

  const handleProductPhotos = async (files: FileList | null) => {
    if (!files?.length || !formData.clientId || !user?.agency_id) return
    if (demoMode) {
      setProductUploads([{ name: 'Demo mode is read-only', status: 'error', message: 'sign in to upload' }])
      return
    }
    for (const file of Array.from(files)) {
      setProductUploads((prev) => [...prev, { name: file.name, status: 'uploading' }])
      try {
        await uploadClientAsset(user.agency_id, formData.clientId, 'product_image', file)
        setProductUploads((prev) => prev.map((u) => (u.name === file.name && u.status === 'uploading' ? { ...u, status: 'done' } : u)))
      } catch (err) {
        setProductUploads((prev) =>
          prev.map((u) =>
            u.name === file.name && u.status === 'uploading'
              ? { ...u, status: 'error', message: err instanceof Error ? err.message : 'upload failed' }
              : u,
          ),
        )
      }
    }
  }

  const updateField = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateUsp = (i: number, value: string) => {
    setFormData((prev) => {
      const usps = [...prev.usps]
      usps[i] = value
      return { ...prev, usps }
    })
  }

  const togglePlatform = (p: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter((x) => x !== p) : [...prev.platforms, p],
    }))
  }

  const handleNext = () => setStep((s) => Math.min(s + 1, 3))
  const handleBack = () => setStep((s) => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    if (demoMode) {
      setError('Demo mode is read-only — sign in with a real account to create projects.')
      return
    }
    if (atProjectLimit) {
      setError(`Your ${plan.name} plan allows ${plan.projectsIncluded} active projects. Archive a project or upgrade to create more.`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const project = await createProject(user!.agency_id!, {
        name: formData.projectName.trim(),
        client_id: formData.clientId,
        discovery_data: {
          product: formData.product,
          objective: formData.objective,
          platforms: formData.platforms,
          social_links: formData.socialLinks.split('\n').map((s) => s.trim()).filter(Boolean),
          budget: formData.budget || undefined,
          deadline: formData.deadline || undefined,
          target_audience: formData.targetAudience,
          competition: formData.competition,
          pain_points: formData.painPoints,
          usps: formData.usps.map((u) => u.trim()).filter(Boolean),
          motto: formData.motto,
          messaging: formData.messaging,
          brand_guidelines: formData.brandGuidelines,
          notes: formData.notes,
          avatar_prefs: {
            gender: formData.avatarGender as AvatarPrefs['gender'],
            age_bracket: formData.avatarAge as AvatarPrefs['age_bracket'],
            tags: formData.avatarTags.trim() || undefined,
          },
        },
        influencer_id: formData.pinnedInfluencerId || null,
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
          Fill in the campaign brief to kick off the AI pipeline.
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
              {s === 1 ? 'Campaign' : s === 2 ? 'Audience & Research' : 'Brand & Messaging'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-brand-800 hidden sm:block" />}
          </div>
        ))}
      </div>

      {atProjectLimit && (
        <div className="mb-6 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
          <p className="text-amber-400 text-xs font-body">
            You&apos;re at your {plan.name} plan limit of {plan.projectsIncluded} active projects ({activeCount} in use).
            Archive a finished project or <Link to="/pricing" className="underline hover:text-amber-300">upgrade your plan</Link> to start a new one.
          </p>
        </div>
      )}

      {/* Step 1: Campaign */}
      {step === 1 && (
        <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 space-y-5">
          <h2 className="font-heading font-bold text-lg">Campaign Basics</h2>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Project Name *</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              className={inputCls}
              placeholder="e.g., Nike — Summer 2026 Campaign"
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Client *</label>
            <select
              value={formData.clientId}
              onChange={(e) => updateField('clientId', e.target.value)}
              className={inputCls}
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
            <label className="block text-sm font-heading text-brand-400 mb-2">Product / Service to Promote *</label>
            <input
              type="text"
              value={formData.product}
              onChange={(e) => updateField('product', e.target.value)}
              className={inputCls}
              placeholder="What are we promoting in this campaign?"
            />
          </div>

          {/* Product photos — the generation pipeline shoots from these */}
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">
              Product Photos <span className="text-brand-700">(recommended for physical products)</span>
            </label>
            <label
              className={`flex flex-col items-center justify-center gap-1.5 border border-dashed rounded-xl px-4 py-6 transition-colors ${
                formData.clientId
                  ? 'border-white/15 hover:border-white/30 cursor-pointer bg-brand-900/40'
                  : 'border-white/10 bg-brand-900/20 opacity-50 cursor-not-allowed'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={!formData.clientId}
                className="hidden"
                onChange={(e) => {
                  handleProductPhotos(e.target.files)
                  e.target.value = ''
                }}
              />
              <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-brand-400 text-xs font-heading">
                {formData.clientId ? 'Click to add product photos (multiple allowed)' : 'Select a client first'}
              </span>
              <span className="text-brand-700 text-[11px] font-body text-center">
                One clean photo per product — e.g. a jewelry brand adds its earrings, rings and necklaces separately. The AI shoots each script from the matching photo.
              </span>
            </label>
            {productUploads.length > 0 && (
              <ul className="mt-2 space-y-1">
                {productUploads.map((u, i) => (
                  <li key={`${u.name}-${i}`} className="flex items-center gap-2 text-xs font-body">
                    {u.status === 'uploading' && (
                      <span className="w-3 h-3 rounded-full border-2 border-blue-400/25 border-t-blue-400 animate-spin shrink-0" />
                    )}
                    {u.status === 'done' && <span className="text-green-400 shrink-0">✓</span>}
                    {u.status === 'error' && <span className="text-red-400 shrink-0">✕</span>}
                    <span className={u.status === 'error' ? 'text-red-400' : 'text-brand-400'}>
                      {u.name}
                      {u.message ? ` — ${u.message}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-brand-700 text-[11px] font-body mt-1.5">
              Photos save to this client&apos;s library (Media Library → Uploads), so future campaigns reuse them.
            </p>
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Campaign Objective</label>
            <select
              value={formData.objective}
              onChange={(e) => updateField('objective', e.target.value)}
              className={inputCls}
            >
              <option value="">Select an objective...</option>
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Target Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = formData.platforms.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-heading tracking-wide border transition-all ${
                      active
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-brand-900 text-brand-400 border-white/10 hover:border-white/25'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Budget <span className="text-brand-700">(optional)</span></label>
              <input
                type="text"
                value={formData.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                className={inputCls}
                placeholder="e.g., $25,000"
              />
              <p className="text-brand-700 text-[11px] font-body mt-1.5">Visible to your team — leave empty if the client prefers not to share.</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleNext}
              disabled={!formData.projectName.trim() || !formData.clientId || !formData.product.trim()}
              className="px-6 py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Audience & Research */}
      {step === 2 && (
        <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 space-y-5">
          <h2 className="font-heading font-bold text-lg">Audience &amp; Research Inputs</h2>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Client&apos;s Social Media Pages</label>
            <textarea
              value={formData.socialLinks}
              onChange={(e) => updateField('socialLinks', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder={'One URL per line — used by the Research AI\nhttps://instagram.com/brand\nhttps://tiktok.com/@brand'}
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Target Audience *</label>
            <textarea
              value={formData.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Demographics, psychographics, platforms they live on, creators they follow…"
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Key Competitors</label>
            <textarea
              value={formData.competition}
              onChange={(e) => updateField('competition', e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Competitors, their social handles, notable campaigns…"
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Pain Points the Product Solves</label>
            <textarea
              value={formData.painPoints}
              onChange={(e) => updateField('painPoints', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="What frustrations does the audience have that this product fixes? These become hook angles."
            />
          </div>

          {/* Cast / Avatar — soft preferences + optional hard pin, collapsed by default */}
          <div className="border border-white/[0.07] rounded-xl bg-brand-900/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setAvatarOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div>
                <h3 className="font-heading font-semibold text-sm text-white">Presenter (AI Avatar)</h3>
                <p className="text-brand-600 text-xs font-body mt-0.5">
                  {(() => {
                    if (formData.pinnedInfluencerId) {
                      const inf = influencers.find((i) => i.id === formData.pinnedInfluencerId)
                      return `Pinned: ${inf?.name ?? 'a specific presenter'}`
                    }
                    const g = formData.avatarGender !== 'any' ? formData.avatarGender : null
                    const a = formData.avatarAge !== 'any' ? formData.avatarAge : null
                    const bits = [g, a, formData.avatarTags.trim() || null].filter(Boolean)
                    return bits.length ? `AI casts · prefers ${bits.join(' · ')}` : 'AI casts the best fit — tap to set preferences'
                  })()}
                </p>
              </div>
              <svg className={`w-4 h-4 text-brand-500 shrink-0 transition-transform ${avatarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {avatarOpen && (
            <div className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading text-brand-500 mb-1.5">Gender preference</label>
                <select value={formData.avatarGender} onChange={(e) => updateField('avatarGender', e.target.value)} className={inputCls}>
                  <option value="any">Any</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-heading text-brand-500 mb-1.5">Age preference</label>
                <select value={formData.avatarAge} onChange={(e) => updateField('avatarAge', e.target.value)} className={inputCls}>
                  <option value="any">Any</option>
                  <option value="18-25">18–25</option>
                  <option value="26-35">26–35</option>
                  <option value="36-50">36–50</option>
                  <option value="50+">50+</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-heading text-brand-500 mb-1.5">Preferred traits (optional)</label>
              <input
                value={formData.avatarTags}
                onChange={(e) => updateField('avatarTags', e.target.value)}
                className={inputCls}
                placeholder="e.g. energetic, warm, professional, sporty…"
              />
            </div>
            {influencers.length > 0 && (
              <div>
                <label className="block text-xs font-heading text-brand-500 mb-1.5">Pin a specific presenter (optional)</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => updateField('pinnedInfluencerId', '')}
                    className={`shrink-0 w-20 rounded-lg border-2 p-1.5 text-center transition-all ${
                      !formData.pinnedInfluencerId ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="w-full aspect-[3/4] rounded bg-brand-900 flex items-center justify-center text-lg">✨</div>
                    <span className="block text-[10px] font-heading text-brand-300 mt-1 truncate">AI decides</span>
                  </button>
                  {influencers.map((inf) => (
                    <button
                      key={inf.id}
                      type="button"
                      onClick={() => updateField('pinnedInfluencerId', inf.id)}
                      className={`shrink-0 w-20 rounded-lg border-2 p-1.5 text-center transition-all ${
                        formData.pinnedInfluencerId === inf.id ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 hover:border-white/25'
                      }`}
                      title={`${inf.gender} · ${inf.age_bracket}${inf.voice_name ? ` · 🎙 ${inf.voice_name}` : ''}`}
                    >
                      {inf.primary_url ? (
                        <img src={inf.primary_url} alt={inf.name} className="w-full aspect-[3/4] rounded object-cover" />
                      ) : (
                        <div className="w-full aspect-[3/4] rounded bg-brand-900" />
                      )}
                      <span className="block text-[10px] font-heading text-brand-300 mt-1 truncate">{inf.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
            )}
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
              disabled={!formData.targetAudience.trim()}
              className="px-6 py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Brand & Messaging */}
      {step === 3 && (
        <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 space-y-5">
          <h2 className="font-heading font-bold text-lg">Brand &amp; Messaging</h2>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Unique Selling Points <span className="text-brand-700">(up to 5)</span></label>
            <div className="space-y-2">
              {formData.usps.map((usp, i) => (
                <input
                  key={i}
                  type="text"
                  value={usp}
                  onChange={(e) => updateUsp(i, e.target.value)}
                  className={inputCls}
                  placeholder={`USP ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Brand Motto / Tagline</label>
              <input
                type="text"
                value={formData.motto}
                onChange={(e) => updateField('motto', e.target.value)}
                className={inputCls}
                placeholder='e.g., "Just Do It"'
              />
            </div>
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Brand Voice &amp; Guidelines</label>
              <input
                type="text"
                value={formData.brandGuidelines}
                onChange={(e) => updateField('brandGuidelines', e.target.value)}
                className={inputCls}
                placeholder="Tone, style, do's and don'ts…"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Specific Messaging for This Project</label>
            <textarea
              value={formData.messaging}
              onChange={(e) => updateField('messaging', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Angles, claims, or phrases the campaign must use (or avoid)…"
            />
          </div>

          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Any other context, references, or special requirements…"
            />
          </div>

          <p className="text-brand-600 text-xs font-body bg-brand-900/40 border border-white/5 rounded-lg px-4 py-3">
            💡 Product photos were added in Step 1. Brand logo, extra photos, and fonts live per client in{' '}
            <Link to="/dashboard/library" className="text-brand-400 hover:text-white underline transition-colors">Media Library → Uploads</Link>{' '}
            — the generation pipeline picks them up from there.
          </p>

          {/* Summary */}
          <div className="bg-brand-900 rounded-xl p-5 border border-white/5">
            <h3 className="font-heading font-semibold text-sm text-brand-300 mb-3">Campaign Summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-brand-600 flex-shrink-0">Project</dt>
                <dd className="text-white font-heading text-right">{formData.projectName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-600 flex-shrink-0">Promoting</dt>
                <dd className="text-white font-heading text-right">{formData.product || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-600 flex-shrink-0">Objective</dt>
                <dd className="text-white font-heading text-right">{formData.objective || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-600 flex-shrink-0">Platforms</dt>
                <dd className="text-white font-heading text-right">{formData.platforms.join(', ') || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brand-600 flex-shrink-0">Deadline</dt>
                <dd className="text-white font-heading text-right">{formData.deadline || '—'}</dd>
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
