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
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export interface RunStageResult {
  job_id: string
  status: string
}

/** Kick off AI generation for a pipeline stage. Returns once queued; the
 *  dashboard watches project_stages/jobs over Realtime for progress. */
export async function runStage(projectId: string, stage: WorkflowStage): Promise<RunStageResult> {
  const res = await fetch(`${API_URL}/v1/projects/${projectId}/stages/${stage}/run`, {
    method: 'POST',
    headers: await authHeader(),
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }
  return res.json()
}
