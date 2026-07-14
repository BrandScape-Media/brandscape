import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { createAgency } from '../lib/api'

const INDUSTRIES = [
  'Marketing & Advertising',
  'Digital Agency',
  'Creative Studio',
  'Full Service Agency',
  'Other',
]

export default function AgencyOnboarding() {
  const { user, refreshProfile, signOut } = useAuth()
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return
    setSubmitting(true)
    setError(null)
    try {
      await createAgency(name, industry || undefined)
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your agency. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <img src="/logo-dark.png" alt="Brandscape" className="h-8 mx-auto mb-8" />

        <div className="bg-brand-900/30 border border-white/5 rounded-2xl p-8">
          <h1 className="font-heading font-bold text-xl mb-2">Set up your agency</h1>
          <p className="text-brand-500 text-sm font-body mb-6">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Create your agency workspace —
            your clients, projects, and team all live under it.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Agency Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="e.g., Northlight Creative"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-heading text-brand-400 mb-2">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors"
              >
                <option value="">Select...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-body bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={name.trim().length < 2 || submitting}
              className="w-full px-6 py-3 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating…' : 'Create Agency'}
            </button>
          </form>

          <p className="text-brand-700 text-xs font-body mt-6 text-center">
            Joining an existing agency? Ask its owner to invite you (team invites are coming soon).
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="block mx-auto mt-6 text-brand-600 hover:text-brand-400 text-xs font-body transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
