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
