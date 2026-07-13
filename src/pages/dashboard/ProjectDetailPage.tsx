import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { workflowStages } from '../../data/workflow'
import WorkflowIcon from '../../components/WorkflowIcon'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../hooks/useData'
import { updateStage, updateProject } from '../../lib/api'
import { projectProgress } from './ProjectsPage'
import type { DiscoveryData, ProjectStage, StageStatus, WorkflowStage } from '../../types'

const STAGE_ORDER: WorkflowStage[] = workflowStages.map((s) => s.stage)

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { demoMode } = useAuth()
  const { data: project, loading, error, reload } = useProject(id)

  const [activeStage, setActiveStage] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([])
  const [editingText, setEditingText] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const stagesByKey = useMemo(() => {
    const map = new Map<WorkflowStage, ProjectStage>()
    project?.stages?.forEach((s) => map.set(s.stage, s))
    return map
  }, [project])

  // default the selected tab to the project's current stage once loaded
  useEffect(() => {
    if (project && activeStage === null) {
      const idx = STAGE_ORDER.indexOf(project.current_stage)
      setActiveStage(idx >= 0 ? idx : 0)
    }
  }, [project, activeStage])

  useEffect(() => {
    setChatMessages([
      {
        role: 'ai',
        text: demoMode
          ? "Hello! I'm working on this project's pipeline. Ask me anything about the analysis, or request changes to the output."
          : 'The AI assistant comes online when the generation backend is connected. Your messages here will become revision requests for the current stage.',
      },
    ])
  }, [demoMode])

  if (loading || (project && activeStage === null)) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="h-6 w-64 bg-white/5 rounded animate-pulse mb-6" />
        <div className="h-40 bg-brand-900/30 border border-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl text-center py-24">
        <p className="text-brand-400 font-heading text-sm mb-2">Project not found</p>
        <p className="text-brand-700 font-body text-xs mb-6">{error ?? 'It may have been deleted, or the link is wrong.'}</p>
        <Link to="/dashboard/projects" className="text-brand-400 hover:text-white text-sm font-heading underline transition-colors">
          Back to Projects
        </Link>
      </div>
    )
  }

  const currentWorkflow = workflowStages[activeStage!]
  const currentStageRow = stagesByKey.get(currentWorkflow.stage)
  const currentStatus: StageStatus = currentStageRow?.status ?? 'pending'
  const completedCount = (project.stages ?? []).filter((s) => s.status === 'completed').length
  const progress = projectProgress(project)

  const statusDotColors: Record<StageStatus, string> = {
    pending: 'bg-brand-700',
    in_progress: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    revision: 'bg-amber-500',
  }

  const handleChatSend = () => {
    if (!chatInput.trim()) return
    const text = chatInput
    setChatMessages((prev) => [...prev, { role: 'user', text }])
    setChatInput('')
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: demoMode
            ? "I've noted your feedback. Would you like me to regenerate this section with those changes, or adjust the direction first?"
            : 'Noted — revision requests will be sent to the AI once the generation backend goes live.',
        },
      ])
    }, 700)
  }

  const handleRunAI = () => {
    setNotice(
      demoMode
        ? 'Demo mode: the AI pipeline is simulated here. Sign up to run it on real projects.'
        : 'The AI engine (Runpod backend) is the next milestone — stage generation will run from here once it is connected.',
    )
  }

  const handleSaveEdit = async () => {
    if (editingText === null || !currentStageRow) return
    if (demoMode) {
      setNotice('Demo mode is read-only.')
      setEditingText(null)
      return
    }
    setSaving(true)
    try {
      await updateStage(project.id, currentWorkflow.stage, {
        content: { ...(currentStageRow.content ?? {}), text: editingText },
      })
      setEditingText(null)
      reload()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleNextStage = async () => {
    const currentIdx = STAGE_ORDER.indexOf(project.current_stage)
    const next = STAGE_ORDER[currentIdx + 1]
    if (!next) return
    if (demoMode) {
      setNotice('Demo mode is read-only.')
      return
    }
    try {
      await updateStage(project.id, next, { status: 'in_progress', started_at: new Date().toISOString() })
      await updateProject(project.id, { current_stage: next })
      reload()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not advance the stage.')
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-brand-600 font-body mb-4">
        <button onClick={() => navigate('/dashboard/projects')} className="hover:text-brand-300 transition-colors">Projects</button>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-brand-400">{project.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/5 flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-brand-600 text-xs font-body">Client: {project.client_name ?? '—'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRunAI}
          className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Run AI
        </button>
      </div>

      {notice && (
        <div className="mb-6 px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-lg flex items-center justify-between gap-4">
          <p className="text-blue-300 text-xs font-body">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-blue-400/60 hover:text-blue-300 text-xs font-heading flex-shrink-0">✕</button>
        </div>
      )}

      {/* Overall Progress */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-brand-500 text-[10px] font-heading tracking-wider">OVERALL PIPELINE</span>
          <span className="text-white text-xs font-heading font-bold">{completedCount} of {STAGE_ORDER.length} stages complete</span>
        </div>
        <div className="h-2 bg-brand-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="mb-8 overflow-x-auto pb-2 -mx-6 px-6">
        <div className="flex gap-1 min-w-max">
          {workflowStages.map((stage, i) => {
            const stageRow = stagesByKey.get(stage.stage)
            const isActive = i === activeStage
            return (
              <button
                key={stage.stage}
                onClick={() => { setActiveStage(i); setEditingText(null) }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'border-white/20 bg-white/[0.04] shadow-lg shadow-white/[0.02]'
                    : 'border-transparent hover:bg-brand-900/40'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColors[stageRow?.status ?? 'pending']}`} />
                <WorkflowIcon name={stage.icon} className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-brand-600'}`} />
                <span className={`text-[11px] font-heading tracking-wider flex-shrink-0 ${
                  isActive ? 'text-white font-bold' : 'text-brand-600'
                }`}>
                  {stage.label.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-900/20 border border-white/5 rounded-xl overflow-hidden">
            {/* Stage Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center">
                  <WorkflowIcon name={currentWorkflow.icon} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg">{currentWorkflow.label}</h2>
                  <p className="text-brand-600 text-xs font-body">{currentWorkflow.description}</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-heading font-bold tracking-wider ${
                currentStatus === 'completed' ? 'bg-green-500/15 text-green-400' :
                currentStatus === 'in_progress' ? 'bg-blue-500/15 text-blue-400' :
                currentStatus === 'revision' ? 'bg-amber-500/15 text-amber-400' :
                'bg-brand-800 text-brand-500'
              }`}>
                {currentStatus.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Stage Content */}
            <div className="p-6">
              {editingText !== null ? (
                <div>
                  <label className="block text-xs font-heading text-brand-500 tracking-wider mb-2">EDIT STAGE OUTPUT</label>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={14}
                    className="w-full px-4 py-3 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-sm leading-relaxed placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors resize-y"
                    placeholder="Stage output…"
                    autoFocus
                  />
                </div>
              ) : (
                <StageBody
                  stage={currentWorkflow.stage}
                  stageRow={currentStageRow}
                  discovery={project.discovery_data ?? null}
                />
              )}

              {/* Action Bar */}
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center gap-3">
                {editingText !== null ? (
                  <>
                    <button
                      onClick={() => setEditingText(null)}
                      className="px-4 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 transition-all"
                    >
                      Cancel
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all disabled:opacity-40"
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </>
                ) : currentStatus === 'completed' ? (
                  <>
                    {currentWorkflow.stage !== 'discovery' && (
                      <button
                        onClick={() => setEditingText(currentStageRow?.content?.text ?? '')}
                        className="px-4 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 hover:bg-white/[0.03] transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Manually
                      </button>
                    )}
                    <button
                      onClick={handleRunAI}
                      className="px-4 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 hover:bg-white/[0.03] transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Request AI Revision
                    </button>
                    <div className="flex-1" />
                    {STAGE_ORDER.indexOf(project.current_stage) === STAGE_ORDER.indexOf(currentWorkflow.stage) &&
                      currentWorkflow.stage !== 'editing' && (
                      <button
                        onClick={handleNextStage}
                        className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2"
                      >
                        Next Stage
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    )}
                  </>
                ) : currentStatus === 'in_progress' ? (
                  <div className="flex flex-wrap items-center gap-3 w-full">
                    <button
                      onClick={handleRunAI}
                      className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run AI for {currentWorkflow.label}
                    </button>
                    <button
                      onClick={() => setEditingText(currentStageRow?.content?.text ?? '')}
                      className="px-4 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 transition-all"
                    >
                      Write Manually
                    </button>
                  </div>
                ) : (
                  <span className="text-brand-600 text-xs font-body">Requires the previous stage to complete first.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stage Overview */}
          <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5">
            <h3 className="font-heading font-semibold text-xs text-brand-300 mb-4 tracking-wider">STAGES</h3>
            <div className="space-y-1">
              {workflowStages.map((stage, i) => {
                const row = stagesByKey.get(stage.stage)
                const isActive = i === activeStage
                return (
                  <button
                    key={stage.stage}
                    onClick={() => { setActiveStage(i); setEditingText(null) }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColors[row?.status ?? 'pending']}`} />
                    <span className={`text-[11px] font-heading flex-1 truncate ${
                      isActive ? 'text-white font-bold' : 'text-brand-500'
                    }`}>
                      {stage.label}
                    </span>
                    <span className="text-[9px] text-brand-700 font-body capitalize flex-shrink-0">
                      {(row?.status ?? 'pending').replace('_', ' ')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* AI Chat */}
          <div className={`bg-brand-900/30 border border-white/5 rounded-xl overflow-hidden transition-all ${chatOpen ? '' : 'max-h-16'}`}>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <h3 className="font-heading font-semibold text-xs text-brand-300 tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                AI ASSISTANT
                {!demoMode && (
                  <span className="px-1.5 py-0.5 rounded bg-brand-800 text-brand-500 text-[8px] tracking-wider">PREVIEW</span>
                )}
              </h3>
              <svg className={`w-4 h-4 text-brand-600 transition-transform ${chatOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {chatOpen && (
              <div className="px-5 pb-5">
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs font-body leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-white text-black'
                          : 'bg-brand-900 text-brand-300 border border-white/5'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                    placeholder="Ask the AI to modify..."
                    className="flex-1 px-3 py-2.5 bg-brand-900 border border-white/10 rounded-lg text-white font-body text-xs placeholder:text-brand-700 focus:outline-none focus:border-white/30 transition-colors"
                  />
                  <button
                    onClick={handleChatSend}
                    className="px-4 py-2.5 bg-white text-black font-heading text-xs font-bold rounded-lg hover:bg-brand-200 transition-colors flex-shrink-0"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const DISCOVERY_FIELDS: { key: keyof DiscoveryData; label: string }[] = [
  { key: 'goals', label: 'Project Goals' },
  { key: 'budget', label: 'Budget' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'target_audience', label: 'Target Audience' },
  { key: 'competition', label: 'Key Competitors' },
  { key: 'brand_guidelines', label: 'Brand Voice & Guidelines' },
  { key: 'notes', label: 'Notes' },
]

function StageBody({ stage, stageRow, discovery }: {
  stage: WorkflowStage
  stageRow?: ProjectStage
  discovery: DiscoveryData | null
}) {
  const status = stageRow?.status ?? 'pending'
  const content = stageRow?.content

  if (stage === 'discovery') {
    if (!discovery) {
      return <EmptyStageNote title="No discovery data" note="This project was created without a discovery questionnaire." />
    }
    return (
      <div className="space-y-2">
        {DISCOVERY_FIELDS.filter(({ key }) => discovery[key]).map(({ key, label }) => (
          <div key={key} className="px-4 py-3 bg-brand-900/20 border border-white/[0.03] rounded-lg">
            <p className="text-brand-600 text-[10px] font-heading tracking-wider uppercase mb-1">{label}</p>
            <p className="text-brand-300 text-sm font-body whitespace-pre-wrap">{discovery[key]}</p>
          </div>
        ))}
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <EmptyStageNote
        title="This stage is queued"
        note="Waiting for the previous stage to complete"
        icon="clock"
      />
    )
  }

  if (status === 'in_progress' && !content) {
    return (
      <EmptyStageNote
        title="This stage is up next"
        note="Run the AI to generate this stage's output, or write it manually."
        icon="play"
      />
    )
  }

  if (!content) {
    return <EmptyStageNote title="No output yet" note="This stage has no content." />
  }

  return (
    <div className="space-y-8">
      {content.prompt_summary && (
        <div className="px-4 py-3 bg-brand-900/40 border border-white/5 rounded-lg">
          <p className="text-brand-600 text-[10px] font-heading tracking-wider uppercase mb-1">Generation Summary</p>
          <p className="text-brand-300 text-sm font-body">{content.prompt_summary}</p>
        </div>
      )}

      {content.text && (
        <div className="text-brand-300 text-sm font-body leading-relaxed whitespace-pre-wrap">{content.text}</div>
      )}

      {content.sections?.map((section, si) => (
        <div key={si}>
          <h3 className="font-heading font-bold text-sm text-brand-200 mb-3 tracking-wide">{section.title}</h3>
          <div className="space-y-2">
            {section.items.map((item, ii) => (
              <div key={ii} className="flex items-center justify-between px-4 py-3 bg-brand-900/20 border border-white/[0.03] rounded-lg">
                <span className="text-brand-300 text-sm font-body">{item.label}</span>
                <div className="flex items-center gap-3">
                  {item.value && <span className="text-white text-sm font-heading font-semibold">{item.value}</span>}
                  {item.tag && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-heading font-bold tracking-wider ${
                      ['Complete', 'Strong', 'Rising', 'Ready'].includes(item.tag) ? 'bg-green-500/15 text-green-400' :
                      ['Opportunity', 'Gap'].includes(item.tag) ? 'bg-blue-500/15 text-blue-400' :
                      item.tag === 'Watch' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-brand-800 text-brand-400'
                    }`}>
                      {item.tag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyStageNote({ title, note, icon = 'clock' }: { title: string; note: string; icon?: 'clock' | 'play' }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-800/50 border border-white/5 flex items-center justify-center">
        {icon === 'clock' ? (
          <svg className="w-8 h-8 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <p className="text-brand-400 font-heading text-sm mb-1">{title}</p>
      <p className="text-brand-700 font-body text-xs">{note}</p>
    </div>
  )
}
