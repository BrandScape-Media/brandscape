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
  industry?: string | null
  plan: PlanTier
  trial_ends_at?: string | null
  usage_generations: number
  usage_revisions: number
  usage_storage: number
  billing_cycle_start?: string | null
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
  industry?: string | null
  website?: string | null
  target_audience?: string | null
  brand_guidelines?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  /** aggregate from `projects(count)` */
  project_count?: number
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

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'revision'

export interface Project {
  id: string
  agency_id: string
  client_id: string
  name: string
  current_stage: WorkflowStage
  discovery_data?: DiscoveryData | null
  created_at: string
  updated_at: string
  /** joined from clients(name) */
  client_name?: string
  /** joined from project_stages(*) */
  stages?: ProjectStage[]
}

export interface ProjectStage {
  id: string
  project_id: string
  stage: WorkflowStage
  status: StageStatus
  content?: StageContentData | null
  started_at?: string | null
  completed_at?: string | null
}

/**
 * Shape of project_stages.content. `text` is the agency-editable
 * output; the backend will also write structured `sections` and, for
 * shootplan, a redacted `prompt_summary` (never the raw prompts).
 */
export interface StageContentData {
  text?: string
  sections?: { title: string; items: { label: string; value?: string; tag?: string }[] }[]
  prompt_summary?: string
  [key: string]: unknown
}

export interface DiscoveryData {
  budget: string
  timeline: string
  goals: string
  target_audience: string
  competition: string
  brand_guidelines: string
  notes: string
}

// ===== Media =====
export interface MediaAsset {
  id: string
  project_id: string
  type: 'image' | 'video' | 'audio'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  url: string
  thumbnail_url?: string | null
  metadata?: Record<string, string> | null
  file_size?: number | null
  created_at: string
  /** joined from projects(name) */
  project_name?: string
}
