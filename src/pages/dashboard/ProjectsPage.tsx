import { Link } from 'react-router-dom'

export default function ProjectsPage() {
  const projects = [
    {
      id: '1',
      name: 'Nike — Summer Campaign',
      client: 'Nike',
      stage: 'Ideation',
      progress: 37,
      status: 'active',
      created: 'Jun 15, 2025',
      updated: '2 hours ago',
      assets: 12,
      gradient: 'from-blue-600/20 to-purple-600/20',
    },
    {
      id: '2',
      name: 'Spotify — Brand Redesign',
      client: 'Spotify',
      stage: 'Research',
      progress: 62,
      status: 'active',
      created: 'Jun 10, 2025',
      updated: '1 day ago',
      assets: 8,
      gradient: 'from-green-600/20 to-emerald-600/20',
    },
    {
      id: '3',
      name: 'Local Coffee Co. — Launch',
      client: 'Local Coffee',
      stage: 'Discovery',
      progress: 12,
      status: 'active',
      created: 'Jun 20, 2025',
      updated: '3 days ago',
      assets: 0,
      gradient: 'from-amber-600/20 to-orange-600/20',
    },
    {
      id: '4',
      name: 'Adidas — Holiday Ads',
      client: 'Adidas',
      stage: 'Editing',
      progress: 88,
      status: 'active',
      created: 'May 28, 2025',
      updated: '5 hours ago',
      assets: 34,
      gradient: 'from-red-600/20 to-pink-600/20',
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl">Projects</h1>
          <p className="text-brand-500 text-sm font-body mt-1">
            {projects.length} active projects across your agency.
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

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/dashboard/projects/${project.id}`}
            className="group bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300"
          >
            {/* Card Top Bar */}
            <div className={`h-1.5 bg-gradient-to-r ${project.gradient}`} />

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base group-hover:text-brand-200 transition-colors truncate">
                    {project.name}
                  </h3>
                  <p className="text-brand-600 text-sm font-body mt-0.5">{project.client}</p>
                </div>
                <StageBadge stage={project.stage} />
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-brand-600 text-[10px] font-heading tracking-wider">PIPELINE PROGRESS</span>
                  <span className="text-brand-400 text-xs font-heading font-bold">{project.progress}%</span>
                </div>
                <div className="h-2 bg-brand-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-white/80 to-white rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-brand-600 font-body">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
                    </svg>
                    {project.assets} assets
                  </span>
                  <span className="text-brand-700 font-body">{project.created}</span>
                </div>
                <span className="text-brand-700 font-body">{project.updated}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    Discovery: { bg: 'bg-brand-800', text: 'text-brand-300' },
    Research: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
    Ideation: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
    Strategy: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
    Scripts: { bg: 'bg-green-500/15', text: 'text-green-400' },
    'Shoot Plan': { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
    Shooting: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
    Editing: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
  }
  const s = styles[stage] ?? { bg: 'bg-brand-800', text: 'text-brand-400' }
  return (
    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-heading font-bold tracking-wider ${s.bg} ${s.text}`}>
      {stage.toUpperCase()}
    </span>
  )
}
