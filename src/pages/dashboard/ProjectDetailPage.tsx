import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { workflowStages } from '../../data/workflow'
import WorkflowIcon from '../../components/WorkflowIcon'

type StageStatus = 'pending' | 'in_progress' | 'completed' | 'revision'

interface StageState {
  status: StageStatus
  content?: string
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeStage, setActiveStage] = useState(1)
  const [chatOpen, setChatOpen] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: 'Hello! I\'m working on the Research stage for this project. Ask me anything about the analysis, or request changes to the output.' },
  ])

  const [stages] = useState<Record<string, StageState>>({
    discovery: { status: 'completed' },
    research: { status: 'in_progress' },
    ideation: { status: 'pending' },
    strategy: { status: 'pending' },
    scripts: { status: 'pending' },
    shootplan: { status: 'pending' },
    shooting: { status: 'pending' },
    editing: { status: 'pending' },
  })

  const currentWorkflow = workflowStages[activeStage]
  const currentStageState = stages[currentWorkflow?.stage ?? '']

  const statusDotColors: Record<StageStatus, string> = {
    pending: 'bg-brand-700',
    in_progress: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    revision: 'bg-amber-500',
  }

  const handleChatSend = () => {
    if (!chatInput.trim()) return
    setChatMessages((prev) => [...prev, { role: 'user', text: chatInput }])
    setChatInput('')
    // Simulated AI response
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'I\'ve noted your feedback. Would you like me to regenerate this section with those changes, or would you prefer to adjust the direction first?' },
      ])
    }, 1000)
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-brand-600 font-body mb-4">
        <button onClick={() => navigate('/dashboard/projects')} className="hover:text-brand-300 transition-colors">Projects</button>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-brand-400">Nike — Summer Campaign</span>
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
            <h1 className="font-heading font-bold text-xl">Nike — Summer Campaign</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-brand-600 text-xs font-body">Client: Nike</span>
              {id && <><span className="text-brand-800">•</span><span className="text-brand-700 text-[10px] font-heading">#{id}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 hover:bg-white/[0.03] transition-all">
            Save Changes
          </button>
          <button className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run AI
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-brand-900/30 border border-white/5 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-brand-500 text-[10px] font-heading tracking-wider">OVERALL PIPELINE</span>
          <span className="text-white text-xs font-heading font-bold">2 of 8 stages complete</span>
        </div>
        <div className="h-2 bg-brand-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all" style={{ width: '25%' }} />
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="mb-8 overflow-x-auto pb-2 -mx-6 px-6">
        <div className="flex gap-1 min-w-max">
          {workflowStages.map((stage, i) => {
            const stageState = stages[stage.stage]
            const isActive = i === activeStage
            return (
              <button
                key={stage.stage}
                onClick={() => setActiveStage(i)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'border-white/20 bg-white/[0.04] shadow-lg shadow-white/[0.02]'
                    : 'border-transparent hover:bg-brand-900/40'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColors[stageState?.status ?? 'pending']}`} />
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
                  <WorkflowIcon name={currentWorkflow?.icon ?? 'discovery'} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg">{currentWorkflow?.label}</h2>
                  <p className="text-brand-600 text-xs font-body">{currentWorkflow?.description}</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-heading font-bold tracking-wider ${
                currentStageState?.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                currentStageState?.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400' :
                currentStageState?.status === 'revision' ? 'bg-amber-500/15 text-amber-400' :
                'bg-brand-800 text-brand-500'
              }`}>
                {currentStageState?.status?.replace('_', ' ').toUpperCase() ?? 'PENDING'}
              </span>
            </div>

            {/* Stage Content */}
            <div className="p-6">
              <StageContent stage={currentWorkflow?.stage ?? 'discovery'} status={currentStageState?.status ?? 'pending'} />

              {/* Action Bar */}
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap items-center gap-3">
                {currentStageState?.status === 'completed' && (
                  <>
                    <button className="px-4 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 hover:bg-white/[0.03] transition-all flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Manually
                    </button>
                    <button className="px-4 py-2.5 border border-white/15 text-white font-heading text-sm rounded-lg hover:border-white/30 hover:bg-white/[0.03] transition-all flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Request AI Revision
                    </button>
                    <div className="flex-1" />
                    <button className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2">
                      Next Stage
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </>
                )}
                {currentStageState?.status === 'in_progress' && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <div>
                      <p className="text-brand-300 text-sm font-heading">AI is working on this stage...</p>
                      <p className="text-brand-600 text-xs font-body">Estimated completion: ~3 minutes</p>
                    </div>
                  </div>
                )}
                {currentStageState?.status === 'pending' && (
                  <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 bg-white text-black font-heading font-bold text-sm rounded-lg hover:bg-brand-200 transition-all flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run AI for {currentWorkflow?.label}
                    </button>
                    <span className="text-brand-600 text-xs font-body">Requires previous stage to complete first</span>
                  </div>
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
                const state = stages[stage.stage]
                const isActive = i === activeStage
                return (
                  <button
                    key={stage.stage}
                    onClick={() => setActiveStage(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColors[state?.status ?? 'pending']}`} />
                    <span className={`text-[11px] font-heading flex-1 truncate ${
                      isActive ? 'text-white font-bold' : 'text-brand-500'
                    }`}>
                      {stage.label}
                    </span>
                    <span className="text-[9px] text-brand-700 font-body capitalize flex-shrink-0">
                      {state?.status?.replace('_', ' ') ?? 'pending'}
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

function StageContent({ stage, status }: { stage: string; status: StageStatus }) {
  const content: Record<string, { sections: { title: string; items: { label: string; value?: string; tag?: string }[] }[] }> = {
    research: {
      sections: [
        {
          title: 'Keyword Research',
          items: [
            { label: 'Primary Keywords', value: '50 identified', tag: 'Complete' },
            { label: 'Search Volume', value: '125K/mo avg', tag: 'High' },
            { label: 'Competition Level', value: 'Medium', tag: 'Opportunity' },
          ],
        },
        {
          title: 'Trend Analysis',
          items: [
            { label: 'Summer Fashion 2025', value: '+340% YoY', tag: 'Rising' },
            { label: 'Athleisure Casual', value: 'Stable', tag: 'Steady' },
            { label: 'Sustainable Sportswear', value: '+180% YoY', tag: 'Rising' },
          ],
        },
        {
          title: 'Competitor Audit',
          items: [
            { label: 'Adidas', value: 'Strong on Instagram', tag: 'Watch' },
            { label: 'Puma', value: 'Weak on TikTok', tag: 'Gap' },
            { label: 'Under Armour', value: 'Focus on performance', tag: 'Differentiator' },
          ],
        },
        {
          title: 'Audience Sentiment',
          items: [
            { label: 'Overall Brand Sentiment', value: '85% positive', tag: 'Strong' },
            { label: 'Key Conversation Themes', value: 'Comfort, Style, Performance', tag: 'Insight' },
            { label: 'Underserved Segments', value: 'Gen Z athleisure', tag: 'Opportunity' },
          ],
        },
      ],
    },
  }

  const fallback: Record<string, { title: string; items: string[] }> = {
    discovery: {
      title: 'Discovery Data',
      items: [
        'Client questionnaire completed',
        'Budget: $50,000 - $100,000',
        'Timeline: 4 weeks',
        'Brand guidelines uploaded',
        'Target audience defined',
      ],
    },
    ideation: {
      title: 'Creative Concepts',
      items: [
        'Concept A: "Freedom in Motion" — Lifestyle-focused',
        'Concept B: "Push Your Limits" — Performance-driven',
        'Concept C: "Summer State of Mind" — Emotional connection',
        'A/B Testing Angles — Headline, visual, and CTA variations',
      ],
    },
    strategy: {
      title: 'Strategic Document',
      items: [
        'Brand Voice: Confident, aspirational, accessible',
        'Tone Guidelines: Bold headlines, warm storytelling',
        'KPI Definitions: Engagement rate, CTR, conversion rate',
        'Conversion Funnel: Awareness → Interest → Trial → Purchase',
      ],
    },
    scripts: {
      title: 'Video Scripts',
      items: [
        'Script 1: 30s Hero Video — "Freedom in Motion"',
        'Script 2: 15s Story Ad — Quick cut, high energy',
        'Script 3: 60s Brand Film — Emotional narrative',
      ],
    },
    shootplan: {
      title: 'Shoot Plan Summary',
      items: [
        '12 scenes planned across 3 scripts',
        'A-Roll: 8 prompts (hero shots, talking heads)',
        'B-Roll: 16 prompts (lifestyle, product details)',
        'VO: 3 voiceover tracks generated',
        'Music: 3 suggestions from Epidemic Sound',
      ],
    },
    shooting: {
      title: 'Content Generation',
      items: [
        'Image Generation: 24/32 completed',
        'Video Clips: 8/12 generating...',
        'Estimated completion: ~8 minutes',
        'GPU: Runpod A100 (on-demand)',
      ],
    },
    editing: {
      title: 'Edit Timeline',
      items: [
        'Music Selected: "Sunrise Drive" — Uplifting Electronic',
        'Voiceover: Synced to Script 1',
        'A-Roll Assembly: Complete',
        'B-Roll Overlay: In progress',
      ],
    },
  }

  const data = content[stage] ?? { sections: [{ title: fallback[stage]?.title ?? stage, items: fallback[stage]?.items?.map(i => ({ label: i })) ?? [] }] }

  if (status === 'pending') {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-800/50 border border-white/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-brand-400 font-heading text-sm mb-1">This stage is queued</p>
        <p className="text-brand-700 font-body text-xs">Waiting for the previous stage to complete</p>
      </div>
    )
  }

  if (status === 'in_progress') {
    const fallbackItems = fallback[stage]?.items ?? ['Processing...']
    return (
      <div>
        <div className="flex items-center gap-3 mb-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
          <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-blue-300 text-sm font-heading">Generating {data.sections[0]?.title ?? 'content'}...</p>
            <p className="text-brand-600 text-xs font-body">This usually takes 2–5 minutes</p>
          </div>
        </div>
        <div className="space-y-3">
          {fallbackItems.slice(0, 4).map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-brand-900/30 rounded-lg px-4 py-3 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-brand-400 rounded-full animate-spin flex-shrink-0" style={{ animationDuration: '1.5s' }} />
              <span className="text-brand-400 text-xs font-body">{item}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {data.sections.map((section, si) => (
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
                      item.tag === 'Complete' || item.tag === 'Strong' || item.tag === 'Rising' ? 'bg-green-500/15 text-green-400' :
                      item.tag === 'Opportunity' || item.tag === 'Gap' ? 'bg-blue-500/15 text-blue-400' :
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
