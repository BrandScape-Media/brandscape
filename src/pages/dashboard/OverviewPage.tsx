import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function OverviewPage() {
  const { user } = useAuth()

  const stats = [
    { label: 'Active Projects', value: '3', change: '+1 this week', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { label: 'Assets Generated', value: '47', change: 'This month', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Revisions Used', value: '12/20', change: 'Professional plan', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { label: 'Storage Used', value: '2.4 GB', change: 'of 50 GB', icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z' },
  ]

  const recentProjects = [
    { name: 'Nike — Summer Campaign', client: 'Nike', stage: 'Ideation', status: 'in_progress' as const, updated: '2 hours ago', progress: 37 },
    { name: 'Spotify — Brand Redesign', client: 'Spotify', stage: 'Research', status: 'completed' as const, updated: '1 day ago', progress: 62 },
    { name: 'Local Coffee Co.', client: 'Local Coffee', stage: 'Discovery', status: 'pending' as const, updated: '3 days ago', progress: 12 },
  ]

  const activity = [
    { action: 'Research stage completed', project: 'Spotify — Brand Redesign', time: '1 hour ago', type: 'success' as const },
    { action: 'Ideation AI running', project: 'Nike — Summer Campaign', time: '2 hours ago', type: 'progress' as const },
    { action: 'New project created', project: 'Local Coffee Co.', time: '3 days ago', type: 'info' as const },
    { action: '3 assets generated', project: 'Nike — Summer Campaign', time: '5 hours ago', type: 'info' as const },
    { action: 'Revision requested', project: 'Spotify — Brand Redesign', time: '1 day ago', type: 'warning' as const },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-brand-500 text-sm font-body mt-1">
            Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>
        <Link
          to="/dashboard/projects/new"
          className="group px-5 py-2.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-all duration-300 flex items-center gap-2 justify-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          NEW PROJECT
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-brand-900/30 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <p className="text-brand-600 text-[10px] font-heading tracking-wider uppercase">
                {stat.label}
              </p>
              <svg className="w-4 h-4 text-brand-700 group-hover:text-brand-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
              </svg>
            </div>
            <p className="font-heading font-black text-3xl text-white">{stat.value}</p>
            <p className="text-brand-600 text-xs font-body mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div>
            <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-brand-400 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction label="New Project" to="/dashboard/projects/new">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </QuickAction>
              <QuickAction label="Add Client" to="/dashboard/clients">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </QuickAction>
              <QuickAction label="Media Library" to="/dashboard/library">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </QuickAction>
              <QuickAction label="Settings" to="/dashboard/settings">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </QuickAction>
            </div>
          </div>

          {/* Recent Projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-brand-400">Recent Projects</h2>
              <Link to="/dashboard/projects" className="text-brand-600 hover:text-brand-300 text-xs font-heading transition-colors flex items-center gap-1">
                View all
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden">
              {recentProjects.map((project, i) => (
                <Link
                  key={i}
                  to={`/dashboard/projects/${i + 1}`}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group ${
                    i > 0 ? 'border-t border-white/5' : ''
                  }`}
                >
                  <StatusDot status={project.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-white truncate group-hover:text-brand-200 transition-colors">{project.name}</p>
                    <p className="text-brand-600 text-xs font-body">{project.client}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 w-24">
                    <div className="flex-1 h-1 bg-brand-800 rounded-full overflow-hidden">
                      <div className="h-full bg-white/60 rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-brand-600 text-[10px] font-heading w-8 text-right">{project.progress}%</span>
                  </div>
                  <span className="hidden md:block text-brand-500 text-xs font-heading w-20">{project.stage}</span>
                  <span className="text-brand-700 text-[10px] font-body w-20 text-right">{project.updated}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="font-heading font-bold text-sm tracking-wide uppercase text-brand-400 mb-4">Activity</h2>
          <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5">
            <div className="space-y-0">
              {activity.map((item, i) => (
                <div key={i} className="relative pb-5 last:pb-0">
                  {i < activity.length - 1 && (
                    <div className="absolute left-1.5 top-3 bottom-0 w-px bg-white/5" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                      item.type === 'success' ? 'bg-green-500' :
                      item.type === 'progress' ? 'bg-blue-500 animate-pulse' :
                      item.type === 'warning' ? 'bg-amber-500' :
                      'bg-brand-600'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-brand-300 text-xs font-body leading-snug">{item.action}</p>
                      <p className="text-brand-600 text-[10px] font-heading mt-0.5 truncate">{item.project}</p>
                      <p className="text-brand-700 text-[10px] font-body mt-0.5">{item.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Summary */}
          <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5 mt-4">
            <h3 className="font-heading font-semibold text-xs text-brand-300 mb-4 tracking-wide">Monthly Usage</h3>
            <div className="space-y-4">
              <UsageBar label="Generations" used={47} total={250} />
              <UsageBar label="Revisions" used={12} total={20} />
              <UsageBar label="Projects" used={3} total={15} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ label, to, children }: { label: string; to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="bg-brand-900/30 border border-white/5 rounded-xl p-5 text-center hover:border-white/10 hover:bg-brand-900/50 transition-all duration-300 group"
    >
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-brand-500 group-hover:text-white group-hover:bg-white/[0.08] group-hover:border-white/10 transition-all duration-300">
        {children}
      </div>
      <span className="text-xs font-heading text-brand-500 group-hover:text-brand-300 transition-colors">
        {label}
      </span>
    </Link>
  )
}

function StatusDot({ status }: { status: 'pending' | 'in_progress' | 'completed' }) {
  const colors = {
    pending: 'bg-brand-600',
    in_progress: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status]} flex-shrink-0`} />
}

function UsageBar({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = Math.round((used / total) * 100)
  const isHigh = pct > 80
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-brand-500 text-[10px] font-heading tracking-wider">{label}</span>
        <span className={`text-[10px] font-heading ${isHigh ? 'text-amber-500' : 'text-brand-600'}`}>
          {used}/{total}
        </span>
      </div>
      <div className="h-1.5 bg-brand-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-500' : 'bg-white/60'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
