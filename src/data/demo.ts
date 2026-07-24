import type { Agency, Client, ClientAsset, MediaAsset, Project, ProjectStage, StageContentData, StageStatus, WorkflowStage } from '../types'
import { workflowStages } from './workflow'

// Showcase dataset used when the app runs in demo mode (no Supabase
// session). Shapes mirror the real database rows exactly so pages are
// written once against real types.

const STAGE_ORDER: WorkflowStage[] = workflowStages.map((s) => s.stage)

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
  usage_regenerations: 63,
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
      {
        title: 'Creative Strategy',
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
      product: 'Summer 2026 athleisure collection',
      objective: 'Brand awareness',
      platforms: ['TikTok', 'Instagram Reels'],
      social_links: ['https://instagram.com/nike', 'https://tiktok.com/@nike'],
      budget: '$75,000',
      deadline: daysAgo(-14).slice(0, 10),
      target_audience: 'Gen Z and millennial athletes, athleisure-first, style-conscious.',
      competition: 'Adidas, Puma, Under Armour',
      pain_points: 'Athleisure that looks good but performs poorly; sustainability guilt.',
      usps: ['Recycled performance fabric', 'Runway-to-track styling', 'Athlete-tested comfort'],
      motto: 'Just Do It',
      messaging: 'Sustainability angle is a priority this season.',
      brand_guidelines: 'Confident, aspirational, accessible. Bold headlines, warm storytelling.',
      notes: '',
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
      product: 'Podcast discovery feature',
      objective: 'Engagement',
      platforms: ['Instagram Reels', 'YouTube Shorts'],
      target_audience: 'Music and podcast listeners, 16–35.',
      competition: 'Apple Music, YouTube Music',
      brand_guidelines: 'Playful, culture-forward, colorful.',
    },
    stages: makeStages('demo-p2', 2, 3),
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
      product: 'New roastery opening',
      objective: 'Local awareness',
      platforms: ['Instagram Reels', 'TikTok'],
      budget: '$8,000',
      target_audience: 'Urban professionals within 5 miles.',
      competition: 'Starbucks, local independents',
      brand_guidelines: 'Warm, artisanal, community-first.',
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
    current_stage: 'shooting',
    discovery_data: null,
    stages: makeStages('demo-p4', 4, 5),
    created_at: daysAgo(46),
    updated_at: hoursAgo(5),
  },
]

export const demoClientAssets: ClientAsset[] = [
  { id: 'demo-u1', agency_id: 'demo-agency-1', client_id: 'demo-c1', client_name: 'Nike', kind: 'logo', name: 'nike-swoosh-white.png', storage_path: 'demo/logo.png', mime_type: 'image/png', file_size: 48_200, created_at: daysAgo(12) },
  { id: 'demo-u2', agency_id: 'demo-agency-1', client_id: 'demo-c1', client_name: 'Nike', kind: 'product_image', name: 'pegasus-41-hero.jpg', storage_path: 'demo/product1.jpg', mime_type: 'image/jpeg', file_size: 2_310_000, created_at: daysAgo(12) },
  { id: 'demo-u3', agency_id: 'demo-agency-1', client_id: 'demo-c1', client_name: 'Nike', kind: 'font', name: 'Futura-Condensed.otf', storage_path: 'demo/font.otf', mime_type: 'font/otf', file_size: 184_000, created_at: daysAgo(11) },
  { id: 'demo-u4', agency_id: 'demo-agency-1', client_id: 'demo-c2', client_name: 'Spotify', kind: 'logo', name: 'spotify-icon-green.svg', storage_path: 'demo/logo2.svg', mime_type: 'image/svg+xml', file_size: 9_400, created_at: daysAgo(8) },
  { id: 'demo-u5', agency_id: 'demo-agency-1', client_id: 'demo-c3', client_name: 'Local Coffee Co.', kind: 'reference', name: 'store-interior-moodboard.jpg', storage_path: 'demo/ref.jpg', mime_type: 'image/jpeg', file_size: 1_120_000, created_at: daysAgo(5) },
]

// Real creatives from the landing showcase double as demo library previews
// (sorted by filename so the picks are stable across builds).
const showcaseUrls = Object.entries(
  import.meta.glob('../assets/showcase/*.{jpg,jpeg,png,webp,JPG,PNG}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>,
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)

const demoImg = (i: number): string => showcaseUrls[i % Math.max(showcaseUrls.length, 1)] ?? '#'

export const demoAssets: MediaAsset[] = [
  { id: 'demo-a1', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'image', status: 'completed', url: demoImg(0), thumbnail_url: demoImg(0), metadata: { name: 'Hero Shot — Nike Summer v3', format: 'PNG', size: '4K' }, created_at: hoursAgo(2) },
  { id: 'demo-a2', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'video', status: 'completed', url: '#', metadata: { name: 'A-Roll — Lifestyle Scene 1', format: 'MP4', size: '30s' }, created_at: hoursAgo(3) },
  { id: 'demo-a3', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'video', status: 'generating', url: '#', metadata: { name: 'B-Roll — Product Detail Close-up', format: 'MP4', size: '5s' }, created_at: hoursAgo(1) },
  { id: 'demo-a4', project_id: 'demo-p2', project_name: 'Spotify — Brand Redesign', type: 'image', status: 'completed', url: demoImg(1), thumbnail_url: demoImg(1), metadata: { name: 'Brand Logo Treatment — Dark BG', format: 'PNG', size: '4K' }, created_at: daysAgo(1) },
  { id: 'demo-a5', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'audio', status: 'completed', url: '#', metadata: { name: 'Voiceover — Script 1 (Male, Warm)', format: 'WAV', size: '45s' }, created_at: hoursAgo(4) },
  { id: 'demo-a6', project_id: 'demo-p4', project_name: 'Adidas — Holiday Ads', type: 'image', status: 'completed', url: demoImg(2), thumbnail_url: demoImg(2), metadata: { name: 'Social Creative A — 1:1 Format', format: 'JPG', size: '1080px' }, created_at: hoursAgo(5) },
  { id: 'demo-a7', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'video', status: 'generating', url: '#', metadata: { name: 'Final Cut — Hero Video 30s', format: 'MP4', size: '30s' }, created_at: hoursAgo(1) },
  { id: 'demo-a8', project_id: 'demo-p1', project_name: 'Nike — Summer Campaign', type: 'audio', status: 'completed', url: '#', metadata: { name: 'Music — Sunrise Drive (Licensed)', format: 'MP3', size: '2:30' }, created_at: hoursAgo(6) },
  { id: 'demo-a9', project_id: 'demo-p4', project_name: 'Adidas — Holiday Ads', type: 'image', status: 'completed', url: demoImg(3), thumbnail_url: demoImg(3), metadata: { name: 'Social Creative B — 9:16 Story', format: 'JPG', size: '1080x1920' }, created_at: hoursAgo(6) },
]
