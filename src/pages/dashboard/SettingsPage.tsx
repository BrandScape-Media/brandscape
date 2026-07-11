import { useAuth } from '../../context/AuthContext'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl">Settings</h1>
        <p className="text-brand-500 text-sm font-body mt-1">
          Manage your account, agency, and subscription.
        </p>
      </div>

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
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Full Name</label>
            <input
              type="text"
              defaultValue={user?.name ?? ''}
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
          <button className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Agency */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 mb-6">
        <h2 className="font-heading font-bold text-lg mb-6">Agency</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Agency Name</label>
            <input
              type="text"
              placeholder="Your Agency Name"
              className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-heading text-brand-400 mb-2">Industry</label>
            <select className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm focus:outline-none focus:border-white/30 transition-colors">
              <option value="">Select...</option>
              <option>Marketing & Advertising</option>
              <option>Digital Agency</option>
              <option>Creative Studio</option>
              <option>Full Service Agency</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-6 mb-6">
        <h2 className="font-heading font-bold text-lg mb-6">Subscription</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-heading font-bold">Professional Plan</p>
            <p className="text-brand-500 text-sm font-body">$799/month • Renews Aug 11, 2025</p>
          </div>
          <button className="px-4 py-2 border border-white/20 text-white font-heading text-sm rounded-lg hover:border-white/40 transition-colors">
            Change Plan
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
          <div>
            <p className="text-brand-600 text-xs font-heading uppercase tracking-wide mb-1">Projects</p>
            <p className="font-heading font-bold">3 / 15</p>
          </div>
          <div>
            <p className="text-brand-600 text-xs font-heading uppercase tracking-wide mb-1">Generations</p>
            <p className="font-heading font-bold">47 / 250</p>
          </div>
          <div>
            <p className="text-brand-600 text-xs font-heading uppercase tracking-wide mb-1">Revisions</p>
            <p className="font-heading font-bold">12 / 20</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/20 rounded-xl p-6">
        <h2 className="font-heading font-bold text-lg mb-2 text-red-400">Danger Zone</h2>
        <p className="text-brand-500 text-sm font-body mb-4">
          Once you delete your account, there is no going back.
        </p>
        <button className="px-4 py-2 border border-red-500/30 text-red-400 font-heading text-sm rounded-lg hover:bg-red-500/10 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  )
}
