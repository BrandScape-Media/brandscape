import { getSupabase } from './supabase/client'
import type { CreditPack, PlanTier, Promotion, UsageSnapshot, WorkflowStage } from '../types'

// Base URL of the orchestrator (Railway). Overridable per-deploy; falls
// back to the production API domain. Guard against empty/whitespace env
// values — `"" ?? fallback` keeps the empty string and turns every API
// call into a relative URL against GitHub Pages (405).
const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, '')
const API_URL = rawApiUrl && rawApiUrl.startsWith('http') ? rawApiUrl : 'https://api.brandscape.media'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await getSupabase().auth.getSession()
  if (!session?.access_token) throw new Error('Your session expired — please sign in again.')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function post(path: string, body?: unknown): Promise<Response> {
  const headers = await authHeader()
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    // only declare a JSON body when one is actually sent — a bare
    // content-type header with an empty body gets rejected as Bad Request
    headers: body === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function put(path: string, body: unknown): Promise<Response> {
  const headers = await authHeader()
  return fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function patch(path: string, body: unknown): Promise<Response> {
  const headers = await authHeader()
  return fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Errors from the orchestrator, carrying its machine-readable `code`. */
export class ApiError extends Error {
  code?: string
  status: number
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function orThrow(res: Response): Promise<Response> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let code: string | undefined
    try {
      const data = await res.json()
      if (data?.error) message = data.error
      if (data?.code) code = data.code
    } catch {
      /* keep default */
    }
    // branch on `code`, never on the wording of `message`
    throw new ApiError(message, res.status, code)
  }
  return res
}

export interface RunStageResult {
  job_id: string
  status: string
}

/** Kick off AI generation for a pipeline stage. Returns once queued; the
 *  dashboard watches project_stages/jobs over Realtime for progress. */
export async function runStage(projectId: string, stage: WorkflowStage): Promise<RunStageResult> {
  const res = await orThrow(await post(`/v1/projects/${projectId}/stages/${stage}/run`))
  return res.json()
}

/** Ask the AI to revise the stage output based on a chat message. */
export async function reviseStage(projectId: string, stage: WorkflowStage, message: string): Promise<RunStageResult> {
  const res = await orThrow(await post(`/v1/projects/${projectId}/stages/${stage}/revise`, { message }))
  return res.json()
}

/** Run the shoot: render the approved shoot-plan into media. Returns once
 *  queued; clips land in the Library as they finish. Throws the preflight
 *  message (no cast / no shoot plan / GPU offline) on 400. */
export async function runShoot(projectId: string): Promise<void> {
  await orThrow(await post(`/v1/projects/${projectId}/shoot`))
}

export type RawsPhase = 'images' | 'audio' | 'video' | 'all'

/** Generate a whole Raws phase (a "Generate all" button). Job-tracked. */
export async function generateRaws(projectId: string, phase: RawsPhase): Promise<void> {
  await orThrow(await post(`/v1/projects/${projectId}/raws/generate`, { phase }))
}

/** Regenerate a single image/video shot card. The new asset supersedes it. */
export async function regenerateShot(projectId: string, shotId: string): Promise<void> {
  await orThrow(await post(`/v1/projects/${projectId}/raws/shot/${encodeURIComponent(shotId)}/regenerate`))
}

/** Regenerate a single voiceover line, optionally with edited wording. */
export async function regenerateVo(projectId: string, voId: string, text?: string): Promise<void> {
  await orThrow(
    await post(`/v1/projects/${projectId}/raws/vo/${encodeURIComponent(voId)}/regenerate`, text != null ? { text } : undefined),
  )
}

// ===== Casting (agency-facing) =====

/** Active influencer roster for the cast pickers (Discovery + project page). */
export interface AgencyInfluencer {
  id: string
  name: string
  gender: 'female' | 'male'
  age_bracket: string
  tags: string[]
  voice_name: string | null
  primary_url: string | null
}

export async function listInfluencersForAgency(): Promise<AgencyInfluencer[]> {
  const res = await orThrow(await get('/v1/influencers'))
  return (await res.json()).influencers ?? []
}

/** Pin/override the campaign's cast; null = let the AI decide at the shoot plan. */
export async function setProjectCast(projectId: string, influencerId: string | null): Promise<void> {
  await orThrow(await post(`/v1/projects/${projectId}/cast`, { influencer_id: influencerId }))
}

// ===== Uploaded assets on Cloudflare R2 (via orchestrator presigned URLs) =====

export interface PresignedUpload {
  url: string
  key: string
}

/**
 * Presign a direct-to-R2 upload. Returns null while R2 isn't configured
 * server-side (503) — the caller then falls back to Supabase Storage.
 * Quota/validation errors throw with the server's message.
 */
export async function presignAssetUpload(input: {
  clientId: string
  fileName: string
  contentType: string
  sizeBytes: number
}): Promise<PresignedUpload | null> {
  const res = await post('/v1/assets/presign-upload', input)
  if (res.status === 503) return null
  return (await orThrow(res)).json()
}

/** Batch of short-lived preview/download URLs for R2-hosted assets, keyed by storage path. */
export async function getAssetViewUrls(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {}
  const res = await orThrow(await post('/v1/assets/view-urls', { keys }))
  const data = await res.json()
  return data.urls ?? {}
}

/** Remove an R2 object (the metadata row is deleted separately under RLS). */
export async function deleteAssetObject(key: string): Promise<void> {
  await orThrow(await post('/v1/assets/delete-object', { key }))
}

// ===== Platform admin (Brandscape staff QC — cross-agency) =====

async function get(path: string): Promise<Response> {
  const headers = await authHeader()
  return fetch(`${API_URL}${path}`, { headers })
}

export interface AdminProjectSummary {
  id: string
  name: string
  archived: boolean
  current_stage: string
  updated_at: string
  agency_name: string
  client_name: string
}

export interface AdminStage {
  stage: string
  status: string
  content: { text?: string; prompt_summary?: string } | null
  completed_at: string | null
}

export interface AdminMedia {
  id: string
  type: 'image' | 'video' | 'audio'
  status: string
  url: string
  view_url: string | null
  metadata?: { name?: string; source?: string } | null
  file_size?: number | null
  created_at: string
}

export interface AdminProjectDetail {
  id: string
  name: string
  agency_id: string
  agency_name: string
  client_name: string
  archived: boolean
  current_stage: string
  discovery_data: Record<string, unknown>
  stages: AdminStage[]
  media: AdminMedia[]
}

export async function adminListProjects(): Promise<AdminProjectSummary[]> {
  const res = await orThrow(await get('/v1/admin/projects'))
  return (await res.json()).projects ?? []
}

export async function adminGetProject(projectId: string): Promise<AdminProjectDetail> {
  const res = await orThrow(await get(`/v1/admin/projects/${projectId}`))
  return res.json()
}

// ===== Shoot-plan machine layer (staff QC — never shown to agencies) =====

export interface AdminShot {
  id: string
  script?: string
  workflow: 'product' | 'composite' | 'broll' | 'talkinghead' | 'voiceover'
  inputs?: string[]
  product_ref?: string
  start_frame?: string
  vo?: string
  language?: string
  duration_s?: number
  prompt?: string
}

export interface AdminShootPlan {
  plan: { influencer_id?: string; cast_why?: string; shots?: AdminShot[] } | null
  influencer: { id: string; name: string; gender: string; age_bracket: string; voice_name: string | null } | null
  vo_ids: string[]
  updated_at: string | null
}

/** The raw shots JSON the shoot renders from — the layer agencies never see. */
export async function adminGetShootPlan(projectId: string): Promise<AdminShootPlan> {
  const res = await orThrow(await get(`/v1/admin/projects/${projectId}/shootplan`))
  return res.json()
}

export async function adminOverrideStage(
  projectId: string,
  stage: string,
  patch: { status?: string; text?: string },
): Promise<void> {
  await orThrow(await post(`/v1/admin/projects/${projectId}/stages/${stage}/override`, patch))
}

/** Edit a project's Discovery brief cross-agency (service role). */
export async function adminUpdateDiscovery(projectId: string, discovery: Record<string, unknown>): Promise<void> {
  await orThrow(await post(`/v1/admin/projects/${projectId}/discovery`, { discovery_data: discovery }))
}

/** Delete a project outright (mistaken creation). */
export async function adminDeleteProject(projectId: string): Promise<void> {
  await orThrow(await post(`/v1/admin/projects/${projectId}/delete`))
}

/** Upload a file so it appears in the project's library as AI-generated media.
 *  `deliverable` tags it as a final client-ready output (Deliverables stage). */
export async function adminUploadMedia(
  projectId: string,
  file: File,
  type: 'image' | 'video' | 'audio',
  deliverable = false,
): Promise<void> {
  const contentType = file.type || 'application/octet-stream'
  const presignRes = await orThrow(
    await post(`/v1/admin/projects/${projectId}/media/presign`, {
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    }),
  )
  const { url, key } = await presignRes.json()
  const putRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file })
  if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`)
  await orThrow(
    await post(`/v1/admin/projects/${projectId}/media/record`, {
      key,
      type,
      fileName: file.name,
      sizeBytes: file.size,
      deliverable,
    }),
  )
}

export async function adminDeleteMedia(assetId: string): Promise<void> {
  await orThrow(await post(`/v1/admin/media/${assetId}/delete`))
}

// ===== Usage & credits =====

/** Live usage for the signed-in agency, with server-side limits attached. */
export async function getUsage(): Promise<UsageSnapshot> {
  const res = await orThrow(await get('/v1/usage'))
  return res.json()
}

// ===== Stripe billing =====

export interface BillingConfig {
  configured: boolean
  live_mode?: boolean
  has_customer?: boolean
  plan?: PlanTier
  subscription_status?: string | null
  subscription_period_end?: string | null
  /** a trial is offered once per agency — false means "Start free trial" */
  has_trialed?: boolean
  trial_ends_at?: string | null
  trial_days?: number
  /** tiers a trial may start on — entry tier only, so the top tiers can't be farmed */
  trial_tiers?: PlanTier[]
  /** last failed charge, while Stripe is still retrying it */
  payment_failed_at?: string | null
  /** Stripe-hosted pay page for that invoice */
  payment_invoice_url?: string | null
  packs: { id: string; credits: number; priceUsd: number }[]
  tiers: { tier: string; interval: 'month' | 'year'; priceUsd: number }[]
}

export async function getBillingConfig(): Promise<BillingConfig> {
  const res = await orThrow(await get('/v1/billing/config'))
  return res.json()
}

/** Returns the Stripe Checkout URL to send the browser to. */
export async function startCheckout(
  body: { kind: 'credits'; pack: string } | { kind: 'subscription'; tier: string; interval: 'month' | 'year' },
): Promise<string> {
  const res = await orThrow(await post('/v1/billing/checkout', body))
  return (await res.json()).url
}

/** Stripe-hosted portal: change plan, update card, cancel, get invoices. */
export async function openBillingPortal(): Promise<string> {
  const res = await orThrow(await post('/v1/billing/portal'))
  return (await res.json()).url
}

export interface RepricedPrice {
  lookup_key: string
  from_cents: number
  to_cents: number
  old_price_id: string
  new_price_id: string
}

export async function adminProvisionBilling(): Promise<{
  live_mode: boolean
  prices: { lookup_key: string; price_id: string }[]
  /** Stripe prices are immutable, so a changed amount mints a new one and
   *  archives the old. Worth showing — it is a real money change. */
  repriced?: RepricedPrice[]
}> {
  const res = await orThrow(await post('/v1/admin/billing/provision'))
  return res.json()
}

// ===== Offers =====

/** Offers for the signed-in agency. The server resolves audience, not us. */
export async function getOffers(): Promise<Promotion[]> {
  const res = await orThrow(await get('/v1/billing/offers'))
  return (await res.json()).offers ?? []
}

/**
 * Pricing-page offers for logged-out visitors — deliberately unauthenticated,
 * so it can't go through `get()` (which throws without a session).
 */
export async function getPublicOffers(): Promise<Promotion[]> {
  const res = await fetch(`${API_URL}/v1/billing/offers/public`)
  if (!res.ok) return []
  return (await res.json()).offers ?? []
}

export async function adminListPromotions(): Promise<Promotion[]> {
  const res = await orThrow(await get('/v1/admin/promotions'))
  return (await res.json()).promotions ?? []
}

/** Create or update, keyed on the unique slug. */
export async function adminSavePromotion(promotion: Partial<Promotion>): Promise<Promotion> {
  const res = await orThrow(await post('/v1/admin/promotions', promotion))
  return (await res.json()).promotion
}

export async function adminDeletePromotion(id: string): Promise<void> {
  await orThrow(await post(`/v1/admin/promotions/${id}/delete`))
}

// ===== Billing controls (staff) =====

export interface AdminAgency {
  id: string
  name: string
  plan: PlanTier
  usage_generations: number
  usage_revisions: number
  usage_regenerations: number
  usage_credits: number
  credit_balance: number
  billing_cycle_start: string | null
  created_at: string
  limits: {
    generationsPerMonth: number
    revisionsPerMonth: number
    regenerationsPerMonth: number
    creditsPerMonth: number
    projects: number
    deliverableProjects: number
    storageGb: number
  }
}

export async function adminListAgencies(): Promise<{ agencies: AdminAgency[]; packs: CreditPack[] }> {
  const res = await orThrow(await get('/v1/admin/agencies'))
  return res.json()
}

export async function adminSetPlan(agencyId: string, plan: string): Promise<void> {
  await orThrow(await post(`/v1/admin/agencies/${agencyId}/plan`, { plan }))
}

export async function adminResetUsage(agencyId: string): Promise<void> {
  await orThrow(await post(`/v1/admin/agencies/${agencyId}/reset-usage`))
}

export async function adminGrantCredits(agencyId: string, amount: number, reason?: string): Promise<number> {
  const res = await orThrow(await post(`/v1/admin/agencies/${agencyId}/credits`, { amount, reason }))
  return (await res.json()).balance
}

export interface CreditLedgerEntry {
  id: string
  project_id: string | null
  project_name: string | null
  delta: number
  kind: string
  reason: string | null
  balance_after: number | null
  created_at: string
}

export async function adminCreditLedger(agencyId: string): Promise<CreditLedgerEntry[]> {
  const res = await orThrow(await get(`/v1/admin/agencies/${agencyId}/ledger`))
  return (await res.json()).entries ?? []
}

// ===== Product photos on an existing project (staff) =====

export interface AdminProductPhoto {
  id: string
  name: string
  storage_path: string
  storage_provider: string
  file_size: number | null
  created_at: string
  view_url: string | null
}

/** The client's product photos behind a project, with preview URLs. */
export async function adminListProductPhotos(
  projectId: string,
): Promise<{ client_name: string; client_id: string; photos: AdminProductPhoto[] }> {
  const res = await orThrow(await get(`/v1/admin/projects/${projectId}/product-photos`))
  return res.json()
}

/** Add a product photo to the project's client library, cross-agency. */
export async function adminUploadProductPhoto(projectId: string, file: File): Promise<void> {
  const contentType = file.type || 'application/octet-stream'
  const presignRes = await orThrow(
    await post(`/v1/admin/projects/${projectId}/product-photos/presign`, {
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    }),
  )
  const { url, key } = await presignRes.json()
  const putRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file })
  if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`)
  await orThrow(
    await post(`/v1/admin/projects/${projectId}/product-photos/record`, {
      key,
      fileName: file.name,
      sizeBytes: file.size,
      contentType,
    }),
  )
}

export async function adminDeleteProductPhoto(assetId: string): Promise<void> {
  await orThrow(await post(`/v1/admin/product-photos/${assetId}/delete`))
}

// ===== AI Playground (staff testbed: LLM + web tools + voice) =====

export interface OrchestratorHealth {
  ok: boolean
  llm_configured: boolean
  r2_configured: boolean
  tts_configured: boolean
  search_configured: boolean
  comfy_configured?: boolean
}

/** Public health probe — null when the orchestrator is unreachable. */
export async function getOrchestratorHealth(): Promise<OrchestratorHealth | null> {
  try {
    const res = await fetch(`${API_URL}/health`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export interface PlaygroundToolCall {
  tool: string
  args: Record<string, unknown>
  ok: boolean
}

export interface PlaygroundReply {
  reply: string
  tool_trace: PlaygroundToolCall[]
}

/** Chat with the production LLM; it can search the live web while answering. */
export async function adminChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  useTools = true,
): Promise<PlaygroundReply> {
  const res = await orThrow(await post('/v1/admin/chat', { messages, use_tools: useTools }))
  return res.json()
}

export interface TtsVoice {
  voice_id: string
  name: string
  category: string | null
  preview_url: string | null
}

export async function adminListVoices(): Promise<{ configured: boolean; voices: TtsVoice[] }> {
  const res = await orThrow(await get('/v1/admin/voices'))
  return res.json()
}

/** Generate a test voiceover clip; resolves to an MP3 blob. */
export async function adminTts(text: string, voiceId?: string): Promise<Blob> {
  const res = await orThrow(await post('/v1/admin/tts', { text, ...(voiceId ? { voice_id: voiceId } : {}) }))
  return res.blob()
}

// ===== Influencer library (curated personas for the media pipeline) =====

export type InfluencerGender = 'female' | 'male'
export type InfluencerAgeBracket = '18-25' | '26-35' | '36-50' | '50+'

export interface InfluencerImage {
  id: string
  influencer_id: string
  r2_key: string
  label: string | null
  is_primary: boolean
  created_at: string
  view_url: string | null
}

export interface Influencer {
  id: string
  name: string
  gender: InfluencerGender
  age_bracket: InfluencerAgeBracket
  voice_id: string | null
  voice_name: string | null
  tags: string[]
  active: boolean
  created_at: string
  images: InfluencerImage[]
}

export async function adminListInfluencers(): Promise<Influencer[]> {
  const res = await orThrow(await get('/v1/admin/influencers'))
  return (await res.json()).influencers ?? []
}

export async function adminCreateInfluencer(input: {
  name: string
  gender: InfluencerGender
  age_bracket: InfluencerAgeBracket
  voice_id?: string
  voice_name?: string
  tags?: string[]
}): Promise<Influencer> {
  const res = await orThrow(await post('/v1/admin/influencers', input))
  return (await res.json()).influencer
}

/** Any field can change while the library is curated — voice included. */
export async function adminUpdateInfluencer(
  id: string,
  patchBody: Partial<{
    name: string
    gender: InfluencerGender
    age_bracket: InfluencerAgeBracket
    voice_id: string
    voice_name: string
    tags: string[]
    active: boolean
  }>,
): Promise<void> {
  await orThrow(await patch(`/v1/admin/influencers/${id}`, patchBody))
}

export async function adminDeleteInfluencer(id: string): Promise<void> {
  await orThrow(await post(`/v1/admin/influencers/${id}/delete`))
}

/** Upload one reference image: presign → direct PUT to R2 → record. */
export async function adminUploadInfluencerImage(
  influencerId: string,
  file: File,
  label?: string,
): Promise<InfluencerImage> {
  const contentType = file.type || 'application/octet-stream'
  const presignRes = await orThrow(
    await post(`/v1/admin/influencers/${influencerId}/images/presign`, {
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    }),
  )
  const { url, key } = await presignRes.json()
  const putRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file })
  if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`)
  const recordRes = await orThrow(
    await post(`/v1/admin/influencers/${influencerId}/images/record`, { key, label }),
  )
  return (await recordRes.json()).image
}

export async function adminSetPrimaryInfluencerImage(imageId: string): Promise<void> {
  await orThrow(await post(`/v1/admin/influencer-images/${imageId}/primary`))
}

export async function adminDeleteInfluencerImage(imageId: string): Promise<void> {
  await orThrow(await post(`/v1/admin/influencer-images/${imageId}/delete`))
}

// ===== Media Lab (drives the ComfyUI GPU behind COMFY_URL) =====

export interface ComfyGpu {
  name: string
  vram_total: number | null
  vram_free: number | null
}

export interface ComfyStatus {
  configured: boolean
  reachable: boolean
  comfyui_version?: string | null
  gpu?: ComfyGpu | null
  error?: string
}

export async function adminComfyStatus(): Promise<ComfyStatus> {
  const res = await orThrow(await get('/v1/admin/comfy/status'))
  return res.json()
}

export type MediaWorkflow = 'product' | 'composite' | 'broll' | 'talkinghead'

export interface GenerateMediaInput {
  workflow: MediaWorkflow
  project_id: string
  prompt?: string
  influencer_id?: string
  influencer_image_id?: string
  image_key?: string
  image_key_2?: string
  vo_text?: string
  voice_id?: string
  duration_seconds?: number
  width?: number
  height?: number
}

/** Queue a generation; poll the returned asset id for progress. */
export async function adminGenerateMedia(input: GenerateMediaInput): Promise<string> {
  const res = await orThrow(await post('/v1/admin/media/generate', input))
  return (await res.json()).asset_id
}

export interface AdminMediaAssetState {
  id: string
  project_id: string
  type: 'image' | 'video' | 'audio'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  url: string
  view_url: string | null
  metadata?: Record<string, string> | null
  file_size?: number | null
  created_at: string
}

export async function adminGetMediaAsset(assetId: string): Promise<AdminMediaAssetState> {
  const res = await orThrow(await get(`/v1/admin/media/${assetId}`))
  return (await res.json()).asset
}

// ===== Freeform workflow bench (AI Playground) =====

/** Upload a scratch input (image/audio) for a bench run; returns its key. */
export async function adminComfyUploadInput(file: File): Promise<string> {
  const contentType = file.type || 'application/octet-stream'
  const presignRes = await orThrow(
    await post('/v1/admin/comfy/upload', { fileName: file.name, contentType, sizeBytes: file.size }),
  )
  const { url, key } = await presignRes.json()
  const putRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file })
  if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`)
  return key
}

export interface BenchRunInput {
  workflow: MediaWorkflow
  prompt?: string
  image_key: string
  image_key_2?: string
  audio_key?: string
  seed?: number
  duration_seconds?: number
  width?: number
  height?: number
}

export async function adminComfyRun(input: BenchRunInput): Promise<string> {
  const res = await orThrow(await post('/v1/admin/comfy/run', input))
  return (await res.json()).run_id
}

export interface BenchRun {
  status: 'running' | 'completed' | 'failed'
  type: 'image' | 'video' | 'audio'
  view_url?: string
  seed?: number
  error?: string
  startedAt: number
}

export async function adminComfyGetRun(runId: string): Promise<BenchRun> {
  const res = await orThrow(await get(`/v1/admin/comfy/run/${runId}`))
  return (await res.json()).run
}

// ===== Render backends (which machine runs a generation, and in what order) =====

export type RenderBackend = 'runpod' | 'local'

export interface RenderSettings {
  chains: { image: RenderBackend[]; video: RenderBackend[] }
  /** What the environment alone implies — shown when the stored chain matches it. */
  env_default: RenderBackend[]
  backends: RenderBackend[]
  comfy: {
    configured: boolean
    reachable: boolean
    driver: string
    error?: string
    workers?: { ready: number; running: number; idle: number; initializing: number; unhealthy: number }
    gpu?: { name: string; vram_total: number | null; vram_free: number | null } | null
  }
}

export async function adminGetRenderSettings(): Promise<RenderSettings> {
  const res = await orThrow(await get('/v1/admin/settings/render'))
  return await res.json()
}

export async function adminSetRenderChains(
  chains: Partial<{ image: RenderBackend[]; video: RenderBackend[] }>,
): Promise<RenderSettings['chains']> {
  const res = await orThrow(await put('/v1/admin/settings/render', chains))
  return (await res.json()).chains
}
