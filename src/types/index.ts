// ===== Auth & Users =====
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  agency_id?: string
  role: 'owner' | 'admin' | 'member'
  /** Brandscape staff: cross-agency QC via the orchestrator admin routes */
  platform_admin?: boolean
  created_at: string
}

export interface Agency {
  id: string
  name: string
  industry?: string | null
  plan: PlanTier
  trial_ends_at?: string | null
  /** a trial is offered once per agency; set when the first one begins */
  has_trialed?: boolean
  subscription_status?: string | null
  subscription_period_end?: string | null
  usage_generations: number
  usage_revisions: number
  usage_regenerations: number
  /** rendered-asset credits spent from this cycle's plan allowance */
  usage_credits: number
  /** purchased credits, roll over between months */
  credit_balance: number
  usage_storage: number
  billing_cycle_start?: string | null
  created_at: string
}

// ===== Usage / credits =====

export interface UsageMeter {
  used: number
  limit: number
}

/** Everything the usage dashboard shows, straight from server-side limits. */
export interface UsageSnapshot {
  plan: PlanTier
  cycle_start: string | null
  meters: {
    generations: UsageMeter
    revisions: UsageMeter
    regenerations: UsageMeter
    credits: UsageMeter
    projects: UsageMeter
    deliverable_projects: UsageMeter
  }
  credit_balance: number
  credit_weights: Record<string, number>
  credits_per_project_shoot: number
  packs: CreditPack[]
}

export interface CreditPack {
  id: string
  credits: number
  priceUsd: number
}

/** One movement in the credit ledger. Negative delta = spent. */
export interface CreditLedgerEntry {
  id: string
  project_id: string | null
  delta: number
  kind: string
  reason: string | null
  allowance_after: number | null
  balance_after: number | null
  created_at: string
}

// ===== Plans =====
/**
 * `free` is a state you land in, not a product you buy — before the trial
 * starts and after a subscription lapses. It has no Stripe price, so it is
 * deliberately absent from the `plans` array the pricing page renders.
 */
export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise'

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
  /** Raws media actions/month (regenerate a card, "generate all/everything") */
  regenerationsPerMonth: number
  /** rendered-asset credits included each month */
  creditsPerMonth: number
  /** how many projects may reach the Deliverables stage */
  deliverableProjects: number
  storageGb: number
  prioritySupport: boolean
  customWorkflows: boolean
  isRecommended?: boolean
}

// ===== Offers =====

/**
 * A marketing offer. Stripe owns the discount maths (coupons + promotion
 * codes); this row owns what is shown, to whom, and when. `discount_label`
 * is display copy only — the real reduction is whatever the code says.
 */
export interface Promotion {
  id: string
  slug: string
  headline: string
  body?: string | null
  cta_label?: string | null
  cta_target: 'upgrade' | 'credits' | 'url'
  cta_url?: string | null
  audience: 'all' | 'trialing' | 'free' | 'starter' | 'professional' | 'low_credits' | 'out_of_credits'
  placement: 'dashboard' | 'pricing' | 'both'
  stripe_promotion_code?: string | null
  discount_label?: string | null
  /** null = live now */
  starts_at?: string | null
  /** null = permanent */
  ends_at?: string | null
  active: boolean
  dismissible: boolean
  priority: number
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
  /** the cast: bound influencer performing this campaign (null = AI decides at the shoot plan) */
  influencer_id?: string | null
  archived?: boolean
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

/** Soft casting guidance the agency sets at Discovery — guides the AI's
 *  influencer pick without forcing it ('any' / empty = no preference). */
export interface AvatarPrefs {
  gender?: 'any' | 'female' | 'male'
  age_bracket?: 'any' | '18-25' | '26-35' | '36-50' | '50+'
  tags?: string
}

export interface DiscoveryData {
  /** what we're promoting for the client */
  product?: string
  /** campaign objective (awareness, engagement, conversions, …) */
  objective?: string
  /** target platforms/formats (TikTok, Instagram Reels, …) */
  platforms?: string[]
  /** client's social pages, fed to Research */
  social_links?: string[]
  /** optional single value — some clients don't share it */
  budget?: string
  /** ISO date */
  deadline?: string
  target_audience?: string
  competition?: string
  pain_points?: string
  /** unique selling propositions, up to 5 */
  usps?: string[]
  motto?: string
  /** specific messaging the agency wants used */
  messaging?: string
  brand_guidelines?: string
  notes?: string
  /** soft casting guidance for the AI (see AvatarPrefs) */
  avatar_prefs?: AvatarPrefs
  /** legacy v1 fields (older projects) */
  goals?: string
  timeline?: string
}

// ===== Uploaded brand assets =====
export type ClientAssetKind = 'logo' | 'product_image' | 'font' | 'reference' | 'other'

export interface ClientAsset {
  id: string
  agency_id: string
  client_id: string
  kind: ClientAssetKind
  name: string
  storage_path: string
  /** where the file bytes live — Supabase Storage (legacy) or Cloudflare R2 */
  storage_provider?: 'supabase' | 'r2'
  mime_type?: string | null
  file_size?: number | null
  uploaded_by?: string | null
  created_at: string
  /** joined from clients(name) */
  client_name?: string
  /** short-lived signed URL for preview/download */
  signed_url?: string
}

// ===== Jobs (AI pipeline runs) =====
export interface Job {
  id: string
  stage?: string | null
  type: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  error?: string | null
  payload?: { phase?: string; auto?: boolean } | null
  created_at: string
  started_at?: string | null
  finished_at?: string | null
  /** only populated by the agency-wide query, which needs a link target */
  project_id?: string | null
  project_name?: string | null
}

// ===== Client share links & comments =====
export interface ShareLink {
  id: string
  agency_id: string
  project_id: string
  token: string
  title?: string | null
  is_active: boolean
  created_at: string
}

export interface SharedAsset {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  thumbnail_url?: string | null
  name: string
  created_at: string
}

export interface SharedGallery {
  title: string
  project_name: string
  assets: SharedAsset[]
}

export interface ShareComment {
  id: string
  asset_id?: string | null
  author_name: string
  body: string
  timestamp_seconds?: number | null
  resolved: boolean
  created_at: string
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
  /** joined from projects(clients(name)) */
  client_name?: string
}

/** Internal agency-team feedback on a generated asset (media_comments table). */
export interface MediaComment {
  id: string
  asset_id: string
  author_id?: string | null
  author_name?: string | null
  body: string
  /** for videos: the frame the note refers to, in whole seconds */
  timestamp_seconds?: number | null
  resolved: boolean
  created_at: string
}
