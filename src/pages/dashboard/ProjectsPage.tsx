import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjects } from '../../hooks/useData'
import { timeAgo, formatDate } from '../../lib/format'
import { workflowStages } from '../../data/workflow'
import type { Project, WorkflowStage } from '../../types'

const VISIBLE_STAGES = new Set(workflowStages.map((s) => s.stage))

export function projectProgress(project: Project): number {
  // ignore rows from retired pipeline stages on older projects
  const stages = (project.stages ?? []).filter((s) => VISIBLE_STAGES.has(s.stage))
  if (stages.length === 0) return 0
  const score = stages.reduce((acc, s) => acc + (s.status === 'completed' ? 1 : s.status === 'in_progress' ? 0.5 : 0), 0)
  return Math.round((score / stages.length) * 100)
}

export function stageLabel(stage: WorkflowStage): string {
  return workflowStages.find((s) => s.stage === stage)?.label ?? stage
}

const STAGE_GRADIENTS: Record<WorkflowStage, string> = {
  discovery: 'from-slate-600/20 to-zinc-600/20',
  research: 'from-blue-600/20 to-cyan-600/20',
  ideation: 'from-purple-600/20 to-blue-600/20',
  strategy: 'from-amber-600/20 to-yellow-600/20',
  scripts: 'from-green-600/20 to-emerald-600/20',
  shootplan: 'from-cyan-600/20 to-teal-600/20',
  shooting: 'from-orange-600/20 to-red-600/20',
  editing: 'from-pink-600/20 to-rose-600/20',
}

export default function ProjectsPage() {
  const { data: projects, loading, error } = useProjects()
  const [showArchived, setShowArchived] = useState(false)

  const archivedCount = (projects ?? []).filter((p) => p.archived).length
  const visible = (projects ?? []).filter((p) => (p.archived ?? false) === showArchived)

  return (
    <div className="p-6 lg:p-8 max-w-[1600px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-2xl">Projects</h1>
          <p className="text-brand-500 text-sm font-body mt-1">
            {loading
              ? 'Loading projects…'
              : showArchived
                ? `${visible.length} archived project${visible.length === 1 ? '' : 's'}.`
                : `${visible.length} active project${visible.length === 1 ? '' : 's'} across your agency.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((s) => !s)}
              className={`px-4 py-2.5 border font-heading text-sm rounded-lg transition-all ${
                showArchived
                  ? 'border-white/40 text-white bg-white/5'
                  : 'border-white/15 text-brand-400 hover:text-white hover:border-white/30'
              }`}
            >
              {showArchived ? '← Active' : `Archived (${archivedCount})`}
            </button>
          )}
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
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/5 border border-red-500/15 rounded-lg">
          <p className="text-red-400 text-xs font-body">Could not load projects: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-brand-900/30 border border-white/5 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 bg-brand-900/20 border border-white/5 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand-900/50 border border-white/5 flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p className="text-brand-400 font-heading text-sm mb-1">No projects yet</p>
          <p className="text-brand-700 font-body text-xs mb-6">Kick off your first AI content pipeline.</p>
          <Link
            to="/dashboard/projects/new"
            className="inline-block px-5 py-2.5 bg-white text-black font-heading font-bold text-sm tracking-wide rounded-lg hover:bg-brand-200 transition-colors"
          >
            NEW PROJECT
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((project) => {
            const progress = projectProgress(project)
            return (
              <Link
                key={project.id}
                to={`/dashboard/projects/${project.id}`}
                className="group bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300"
              >
                <div className={`h-1.5 bg-gradient-to-r ${STAGE_GRADIENTS[project.current_stage]}`} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-base group-hover:text-brand-200 transition-colors truncate">
                        {project.name}
                      </h3>
                      <p className="text-brand-600 text-sm font-body mt-0.5">{project.client_name ?? '—'}</p>
                    </div>
                    <StageBadge stage={project.current_stage} />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-brand-600 text-[10px] font-heading tracking-wider">PIPELINE PROGRESS</span>
                      <span className="text-brand-400 text-xs font-heading font-bold">{progress}%</span>
                    </div>
                    <div className="h-2 bg-brand-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-white/80 to-white rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-700 font-body">{formatDate(project.created_at)}</span>
                    <span className="text-brand-700 font-body">{timeAgo(project.updated_at)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function StageBadge({ stage }: { stage: WorkflowStage }) {
  const styles: Record<WorkflowStage, { bg: string; text: string }> = {
    discovery: { bg: 'bg-brand-800', text: 'text-brand-300' },
    research: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
    ideation: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
    strategy: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
    scripts: { bg: 'bg-green-500/15', text: 'text-green-400' },
    shootplan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
    shooting: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
    editing: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
  }
  const s = styles[stage] ?? { bg: 'bg-brand-800', text: 'text-brand-400' }
  return (
    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-heading font-bold tracking-wider whitespace-nowrap ${s.bg} ${s.text}`}>
      {stageLabel(stage).toUpperCase()}
    </span>
  )
}
