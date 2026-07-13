import { getSupabase } from './supabase/client'
import type {
  Agency,
  Client,
  DiscoveryData,
  MediaAsset,
  Project,
  ProjectStage,
  StageContentData,
  StageStatus,
  WorkflowStage,
} from '../types'

// ===== Profile =====

export async function updateProfileName(userId: string, name: string): Promise<void> {
  const { error } = await getSupabase().from('profiles').update({ name }).eq('id', userId)
  if (error) throw error
}

// ===== Agency =====

export async function getAgency(agencyId: string): Promise<Agency | null> {
  const { data, error } = await getSupabase().from('agencies').select('*').eq('id', agencyId).maybeSingle()
  if (error) throw error
  return data
}

/** Calls the security-definer RPC that creates the agency and promotes the caller to owner. */
export async function createAgency(name: string, industry?: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_agency', {
    agency_name: name,
    agency_industry: industry ?? null,
  })
  if (error) throw error
  return data as string
}

export async function updateAgency(agencyId: string, patch: { name?: string; industry?: string }): Promise<void> {
  const { error } = await getSupabase().from('agencies').update(patch).eq('id', agencyId)
  if (error) throw error
}

// ===== Clients =====

export async function listClients(): Promise<Client[]> {
  const { data, error } = await getSupabase()
    .from('clients')
    .select('*, projects(count)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    project_count: row.projects?.[0]?.count ?? 0,
    projects: undefined,
  }))
}

export interface ClientInput {
  name: string
  industry?: string
  website?: string
  target_audience?: string
}

export async function createClient(agencyId: string, input: ClientInput): Promise<Client> {
  const { data, error } = await getSupabase()
    .from('clients')
    .insert({ agency_id: agencyId, ...input })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(clientId: string, patch: ClientInput): Promise<void> {
  const { error } = await getSupabase().from('clients').update(patch).eq('id', clientId)
  if (error) throw error
}

export async function deleteClient(clientId: string): Promise<void> {
  const { error } = await getSupabase().from('clients').delete().eq('id', clientId)
  if (error) throw error
}

// ===== Projects =====

const PROJECT_SELECT = '*, clients(name), project_stages(*)'

interface ProjectRow extends Omit<Project, 'client_name' | 'stages'> {
  clients: { name: string } | null
  project_stages: ProjectStage[] | null
}

function mapProject(row: ProjectRow): Project {
  const { clients, project_stages, ...rest } = row
  return {
    ...rest,
    client_name: clients?.name,
    stages: project_stages ?? [],
  }
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from('projects')
    .select(PROJECT_SELECT)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ProjectRow[]).map(mapProject)
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await getSupabase()
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', projectId)
    .maybeSingle()
  if (error) throw error
  return data ? mapProject(data as ProjectRow) : null
}

export async function createProject(
  agencyId: string,
  input: { name: string; client_id: string; discovery_data: DiscoveryData },
): Promise<Project> {
  // the on_project_created trigger auto-creates the 8 stage rows
  const { data, error } = await getSupabase()
    .from('projects')
    .insert({ agency_id: agencyId, ...input })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(
  projectId: string,
  patch: { name?: string; current_stage?: WorkflowStage; discovery_data?: DiscoveryData },
): Promise<void> {
  const { error } = await getSupabase().from('projects').update(patch).eq('id', projectId)
  if (error) throw error
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await getSupabase().from('projects').delete().eq('id', projectId)
  if (error) throw error
}

// ===== Project stages =====

export async function updateStage(
  projectId: string,
  stage: WorkflowStage,
  patch: {
    content?: StageContentData
    status?: StageStatus
    started_at?: string | null
    completed_at?: string | null
  },
): Promise<void> {
  const { error } = await getSupabase()
    .from('project_stages')
    .update(patch)
    .eq('project_id', projectId)
    .eq('stage', stage)
  if (error) throw error
}

// ===== Media assets =====

export async function listAssets(): Promise<MediaAsset[]> {
  const { data, error } = await getSupabase()
    .from('media_assets')
    .select('*, projects!inner(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const { projects, ...rest } = row
    return { ...rest, project_name: projects?.name }
  })
}
