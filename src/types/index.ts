// ===== Auth & Users =====
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  agency_id?: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export interface Agency {
  id: string
  name: string
  plan: PlanTier
  members: User[]
  usage: UsageStats
  created_at: string
}

// ===== Plans =====
export type PlanTier = 'starter' | 'professional' | 'enterprise'

export interface PlanFeature {
  label: string
  included: boolean
}

export interface Plan {
  tier: PlanTier
  name: string
  priceMonthly: number
  priceYearly: number
  description: string
  features: PlanFeature[]
  revisionsIncluded: number
  projectsIncluded: number
  generationsPerMonth: number
  prioritySupport: boolean
  customWorkflows: boolean
  isRecommended?: boolean
}

// ===== Clients =====
export interface Client {
  id: string
  agency_id: string
  name: string
  industry: string
  brand_guidelines?: BrandGuidelines
  created_at: string
  updated_at: string
}

export interface BrandGuidelines {
  voice_tone: string
  visual_style: string
  color_palette: string[]
  logo_urls: string[]
  do_and_dont: string
  target_audience: string
}

// ===== Projects & Workflow =====
export type WorkflowStage =
  | 'discovery'
  | 'research'
  | 'ideation'
  | 'strategy'
  | 'scripts'
  | 'shootplan'
  | 'shooting'
  | 'editing'

export interface Project {
  id: string
  agency_id: string
  client_id: string
  name: string
  current_stage: WorkflowStage
  stages: ProjectStage[]
  discovery_data?: DiscoveryData
  created_at: string
  updated_at: string
}

export interface ProjectStage {
  stage: WorkflowStage
  status: 'pending' | 'in_progress' | 'completed' | 'revision'
  content?: Record<string, unknown>
  started_at?: string
  completed_at?: string
}

export interface DiscoveryData {
  budget: string
  timeline: string
  goals: string
  client_questionnaire: Record<string, string>
  brand_guidelines_url?: string
  target_audience: string
  competition: string[]
  notes: string
}

// ===== Usage =====
export interface UsageStats {
  generationsThisMonth: number
  revisionsThisMonth: number
  activeProjects: number
  storageUsed: number
}

// ===== Media =====
export interface MediaAsset {
  id: string
  project_id: string
  type: 'image' | 'video' | 'audio'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  url: string
  thumbnail_url?: string
  metadata: Record<string, string>
  generated_at: string
}
