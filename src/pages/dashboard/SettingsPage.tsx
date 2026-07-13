import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAgency, useProjects } from '../../hooks/useData'
import { updateAgency, updateProfileName } from '../../lib/api'
import { plans } from '../../data/plans'
import { formatDate } from '../../lib/format'

export default function SettingsPage() {
  const { user, demoMode, refreshProfile } = useAuth()
  const { data: agency, reload: reloadAgency } = useAgency()
  const { data: projects } = useProjects()

  const [name, setName] = useState(user?.name ?? '')
  const [agencyName, setAgencyName] = useState('')
  const [agencyIndustry, setAgencyIndustry] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAgency, setSavingAgency] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (agency) {
      setAgencyName(agency.name)
      setAgencyIndustry(agency.industry ?? '')
    }
  }, [agency])

  const canEditAgency = user?.role === 'owner' || user?.role === 'admin'
  const plan = plans.find((p) => p.tier === agency?.plan) ?? plans[0]

  const notify = (kind: 'ok' | 'err', text: string) => {
    setMessage({ kind, text })
    window.setTimeout(() => setMessage(null), 4000)
  }

  const handleSaveProfile = async () => {
    if (demoMode) return notify('err', 'Demo mode is read-only.')
    if (!user || !name.trim()) return
    setSavingProfile(true)
    try {
      await updateProfileName(user.id, name.trim())
      await refreshProfile()
      notify('ok', 'Profile updated.')
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Could not update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveAgency = async () => {
    if (demoMode) return notify('err', 'Demo mode is read-only.')
    if (!agency || !agencyName.trim()) return
    setSavingAgency(true)
    try {
      await updateAgency(agency.id, { name: agencyName.trim(), industry: agencyIndustry || undefined })
      reloadAgency()
      notify('ok', 'Agency updated.')
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Could not update agency.')
    } finally {
      setSavingAgency(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl">Settings</h1>
        <p className="text-brand-500 text-sm font-body mt-1">
          Manage your account, agency, and subscription.
        </p>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg border text-xs font-body ${
          message.kind === 'ok'
            ? 'bg-green-500/5 border-green-500/15 text-green-400'
            : 'bg-red-500/5 border-red-500/15 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 mb-6">
        <h2 className="font-heading font-bold text-lg mb-6">Profile</h2>
        <div className="flex items-center gap-6 mb-6">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-heading font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="font-heading font-bold text-lg">{user?.name ?? 'User'}</p>
            <p className="text-brand-500 text-sm font-body">{user?.email}</p>
            <p className="text-brand-700 text-xs font-body mt-0.5 capitalize">{user?.role} account</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Email</label>
            <input
              type="email"
              defaultValue={user?.email ?? ''}
              disabled
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-brand-500 font-body text-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !name.trim() || name.trim() === user?.name}
            className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Agency */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-bold text-lg">Agency</h2>
          {!canEditAgency && (
            <span className="text-brand-600 text-xs font-body">Only owners and admins can edit</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Agency Name</label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              disabled={!canEditAgency}
              placeholder="Your Agency Name"
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors disabled:text-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Industry</label>
            <select
              value={agencyIndustry}
              onChange={(e) => setAgencyIndustry(e.target.value)}
              disabled={!canEditAgency}
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors disabled:text-brand-500"
            >
              <option value="">Select...</option>
              <option>Marketing & Advertising</option>
              <option>Digital Agency</option>
              <option>Creative Studio</option>
              <option>Full Service Agency</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        {canEditAgency && (
          <div className="mt-4">
            <button
              onClick={handleSaveAgency}
              disabled={savingAgency || !agencyName.trim()}
              className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {savingAgency ? 'Saving…' : 'Save Agency'}
            </button>
          </div>
        )}
      </div>

      {/* Plan */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 mb-6">
        <h2 className="font-heading font-bold text-lg mb-6">Subscription</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-heading font-bold">{plan.name} Plan</p>
            <p className="text-brand-500 text-sm font-body">
              ${plan.priceMonthly}/month
              {agency?.trial_ends_at && new Date(agency.trial_ends_at) > new Date() && (
                <span className="text-amber-400"> • Trial ends {formatDate(agency.trial_ends_at)}</span>
              )}
            </p>
          </div>
          <Link
            to="/pricing"
            className="px-4 py-2 border border-white/20 text-white font-heading text-sm rounded-lg hover:border-white/40 transition-colors"
          >
            Change Plan
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
          <div>
            <p className="text-brand-600 text-xs font-heading uppercase tracking-wide mb-1">Projects</p>
            <p className="font-heading font-bold">{projects?.length ?? 0} / {plan.projectsIncluded}</p>
          </div>
          <div>
            <p className="text-brand-600 text-xs font-heading uppercase tracking-wide mb-1">Generations</p>
            <p className="font-heading font-bold">{agency?.usage_generations ?? 0} / {plan.generationsPerMonth}</p>
          </div>
          <div>
            <p className="text-brand-600 text-xs font-heading uppercase tracking-wide mb-1">Revisions</p>
            <p className="font-heading font-bold">{agency?.usage_revisions ?? 0} / {plan.revisionsIncluded}</p>
          </div>
        </div>
        <p className="text-brand-700 text-xs font-body mt-4">
          Online billing (Stripe) is coming soon — plan changes are handled manually until then.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/20 rounded-xl p-6">
        <h2 className="font-heading font-bold text-lg mb-2 text-red-400">Danger Zone</h2>
        <p className="text-brand-500 text-sm font-body mb-4">
          Account deletion is permanent and removes your agency&apos;s data. Contact{' '}
          <a href="mailto:support@brandscape.media" className="underline hover:text-brand-300 transition-colors">support@brandscape.media</a>{' '}
          to delete your account.
        </p>
      </div>
    </div>
  )
}
