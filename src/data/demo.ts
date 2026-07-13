import type { Agency, Client, MediaAsset, Project, ProjectStage, StageContentData, StageStatus, WorkflowStage } from '../types'

// Showcase dataset used when the app runs in demo mode (no Supabase
// session). Shapes mirror the real database rows exactly so pages are
// written once against real types.

const STAGE_ORDER: WorkflowStage[] = [
  'discovery',
  'research',
  'ideation',
  'strategy',
  'scripts',
  'shootplan',
  'shooting',
  'editing',
]

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const daysAgo = (d: number) => hoursAgo(d * 24)

export const demoAgency: Agency = {
  id: 'demo-agency-1',
  name: 'Demo Agency',
  industry: 'Digital Agency',
  plan: 'professional',
  trial_ends_at: null,
  usage_generations: 47,
  usage_revisions: 12,
  usage_storage: 2.4 * 1024 * 1024 * 1024,
  billing_cycle_start: daysAgo(11),
  created_at: daysAgo(60),
}

export const demoClients: Client[] = [
  { id: 'demo-c1', agency_id: 'demo-agency-1', name: 'Nike', industry: 'Sportswear', website: 'https://nike.com', target_audience: 'Gen Z & millennial athletes', created_at: daysAgo(40), updated_at: hoursAgo(2), project_count: 2 },
  { id: 'demo-c2', agency_id: 'demo-agency-1', name: 'Spotify', industry: 'Technology', website: 'https://spotify.com', target_audience: 'Music lovers 16–35', created_at: daysAgo(35), updated_at: daysAgo(1), project_count: 1 },
  { id: 'demo-c3', agency_id: 'demo-agency-1', name: 'Local Coffee Co.', industry: 'Food & Beverage', website: null, target_audience: 'Urban professionals', created_at: daysAgo(20), updated_at: daysAgo(3), project_count: 1 },
]

const researchContent: StageContentData = {
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
        { label: 'Summer Fashion 2026', value: '+340% YoY', tag: 'Rising' },
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
}

const stageShowcase: Partial<Record<WorkflowStage, StageContentData>> = {
  research: researchContent,
  ideation: {
    sections: [
      {
        title: 'Creative Concepts',
        items: [
          { label: 'Concept A: "Freedom in Motion"', value: 'Lifestyle-focused' },
          { label: 'Concept B: "Push Your Limits"', value: 'Performance-driven' },
          { label: 'Concept C: "Summer State of Mind"', value: 'Emotional connection' },
          { label: 'A/B Testing Angles', value: 'Headline, visual, CTA variations' },
        ],
      },
    ],
  },
  strategy: {
    sections: [
      {
        title: 'Strategic Document',
        items: [
          { label: 'Brand Voice', value: 'Confident, aspirational, accessible' },
          { label: 'Tone Guidelines', value: 'Bold headlines, warm storytelling' },
          { label: 'KPI Definitions', value: 'Engagement rate, CTR, conversion' },
          { label: 'Conversion Funnel', value: 'Awareness → Interest → Trial → Purchase' },
        ],
      },
    ],
  },
  scripts: {
    sections: [
      {
        title: 'Video Scripts',
        items: [
          { label: 'Script 1: 30s Hero Video', value: '"Freedom in Motion"' },
          { label: 'Script 2: 15s Story Ad', value: 'Quick cut, high energy' },
          { label: 'Script 3: 60s Brand Film', value: 'Emotional narrative' },
        ],
      },
    ],
  },
  shootplan: {
    prompt_summary: '12 scenes across 3 scripts. A-Roll: 8 hero/talking-head shots. B-Roll: 16 lifestyle and product-detail shots. 3 VO tracks, 3 music suggestions.',
    sections: [
      {
        title: 'Shoot Plan Summary',
        items: [
          { label: 'Scenes Planned', value: '12 across 3 scripts' },
          { label: 'A-Roll', value: '8 prompts', tag: 'Ready' },
          { label: 'B-Roll', value: '16 prompts', tag: 'Ready' },
          { label: 'Voiceover', value: '3 tracks generated' },
          { label: 'Music', value: '3 Epidemic Sound suggestions' },
        ],
      },
    ],
  },
}

function makeStages(projectId: string, completedThrough: number, inProgress?: number): ProjectStage[] {
  return STAGE_ORDER.map((stage, i) => {
    const status: StageStatus = i <= completedThrough ? 'completed' : i === inProgress ? 'in_progress' : 'pending'
    return {
      id: `${projectId}-s${i}`,
      project_id: projectId,
      stage,
      status,
      content: status !== 'pending' ? stageShowcase[stage] ?? null : null,
      started_at: status !== 'pending' ? daysAgo(8 - i) : null,
      completed_at: status === 'completed' ? daysAgo(7 - i) : null,
    }
  })
}

export const demoProjects: Project[] = [
  {
    id: 'demo-p1',
    agency_id: 'demo-agency-1',
    client_id: 'demo-c1',
    client_name: 'Nike',
    name: 'Nike — Summer Campaign',
    current_stage: 'ideation',
    discovery_data: {
      budget: '$50,000 - $100,000',
      timeline: '4 weeks',
      goals: 'Launch the summer collection with high-energy short-form video across TikTok and Instagram Reels.',
      target_audience: 'Gen Z and millennial athletes, athleisure-first, style-conscious.',
      competition: 'Adidas, Puma, Under Armour',
      brand_guidelines: 'Confident, aspirational, accessible. Bold headlines, warm storytelling.',
      notes: 'Sustainability angle is a priority this season.',
    },
    stages: makeStages('demo-p1', 1, 2),
    created_at: daysAgo(28),
    updated_at: hoursAgo(2),
  },
  {
    id: 'demo-p2',
    agency_id: 'demo-agency-1',
    client_id: 'demo-c2',
    client_name: 'Spotify',
    name: 'Spotify — Brand Redesign',
    current_stage: 'scripts',
    discovery_data: {
      budget: '$10,000 - $50,000',
      timeline: '6 weeks',
      goals: 'Refresh social presence around podcast discovery.',
      target_audience: 'Music and podcast listeners, 16–35.',
      competition: 'Apple Music, YouTube Music',
      brand_guidelines: 'Playful, culture-forward, colorful.',
      notes: '',
    },
    stages: makeStages('demo-p2', 3, 4),
    created_at: daysAgo(33),
    updated_at: daysAgo(1),
  },
  {
    id: 'demo-p3',
    agency_id: 'demo-agency-1',
    client_id: 'demo-c3',
    client_name: 'Local Coffee Co.',
    name: 'Local Coffee Co. — Launch',
    current_stage: 'research',
    discovery_data: {
      budget: '< $10,000',
      timeline: '3 weeks',
      goals: 'Local awareness for the new roastery opening.',
      target_audience: 'Urban professionals within 5 miles.',
      competition: 'Starbucks, local independents',
      brand_guidelines: 'Warm, artisanal, community-first.',
      notes: '',
    },
    stages: makeStages('demo-p3', 0, 1),
    created_at: daysAgo(23),
    updated_at: daysAgo(3),
  },
  {
    id: 'demo-p4',
    agency_id: 'demo-agency-1',
    client_id: 'demo-c1',
    client_name: 'Nike',
    name: 'Adidas — Holiday Ads',
    current_stage: 'editing',
    discovery_data: null,
    stages: makeStages('demo-p4', 6, 7),
    created_at: daysAgo(46),
    updated_at: hoursAgo(5),
  },
]

export const demoAssets: MediaAsset[] = [
  { id: 'demo-a1', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'image', status: 'completed', url: '#', metadata: { name: 'Hero Shot — Nike Summer v3', format: 'PNG', size: '4K' }, created_at: hoursAgo(2) },
  { id: 'demo-a2', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'video', status: 'completed', url: '#', metadata: { name: 'A-Roll — Lifestyle Scene 1', format: 'MP4', size: '30s' }, created_at: hoursAgo(3) },
  { id: 'demo-a3', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'video', status: 'generating', url: '#', metadata: { name: 'B-Roll — Product Detail Close-up', format: 'MP4', size: '5s' }, created_at: hoursAgo(1) },
  { id: 'demo-a4', project_id: 'demo-p2', project_name: 'Spotify — Brand Redesign', type: 'image', status: 'completed', url: '#', metadata: { name: 'Brand Logo Treatment — Dark BG', format: 'PNG', size: '4K' }, created_at: daysAgo(1) },
  { id: 'demo-a5', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'audio', status: 'completed', url: '#', metadata: { name: 'Voiceover — Script 1 (Male, Warm)', format: 'WAV', size: '45s' }, created_at: hoursAgo(4) },
  { id: 'demo-a6', project_id: 'demo-p4', project_name: 'Adidas — Holiday Ads', type: 'image', status: 'completed', url: '#', metadata: { name: 'Social Creative A — 1:1 Format', format: 'JPG', size: '1080px' }, created_at: hoursAgo(5) },
  { id: 'demo-a7', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'video', status: 'generating', url: '#', metadata: { name: 'Final Cut — Hero Video 30s', format: 'MP4', size: '30s' }, created_at: hoursAgo(1) },
  { id: 'demo-a8', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'audio', status: 'completed', url: '#', metadata: { name: 'Music — Sunrise Drive (Licensed)', format: 'MP3', size: '2:30' }, created_at: hoursAgo(6) },
  { id: 'demo-a9', project_id: 'demo-p4', project_name: 'Adidas — Holiday Ads', type: 'image', status: 'completed', url: '#', metadata: { name: 'Social Creative B — 9:16 Story', format: 'JPG', size: '1080x1920' }, created_at: hoursAgo(6) },
]
