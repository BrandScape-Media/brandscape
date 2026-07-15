import { getSupabase } from './supabase/client'
import type { WorkflowStage } from '../types'

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

async function orThrow(res: Response): Promise<Response> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      /* keep default */
    }
    throw new Error(message)
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

export async function adminOverrideStage(
  projectId: string,
  stage: string,
  patch: { status?: string; text?: string },
): Promise<void> {
  await orThrow(await post(`/v1/admin/projects/${projectId}/stages/${stage}/override`, patch))
}

/** Upload a file so it appears in the project's library as AI-generated media. */
export async function adminUploadMedia(
  projectId: string,
  file: File,
  type: 'image' | 'video' | 'audio',
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
    }),
  )
}

export async function adminDeleteMedia(assetId: string): Promise<void> {
  await orThrow(await post(`/v1/admin/media/${assetId}/delete`))
}
