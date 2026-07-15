import { getSupabase } from './supabase/client'
import { presignAssetUpload, getAssetViewUrls, deleteAssetObject } from './orchestrator'
import type {
  Agency,
  Client,
  ClientAsset,
  ClientAssetKind,
  DiscoveryData,
  Job,
  MediaAsset,
  Project,
  ProjectStage,
  ShareComment,
  ShareLink,
  SharedGallery,
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
  /** brand kit details: { colors: string[], motto: string, fonts: string[] } */
  brand_guidelines?: Record<string, unknown>
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
  patch: { name?: string; current_stage?: WorkflowStage; discovery_data?: DiscoveryData; archived?: boolean },
): Promise<void> {
  const { error } = await getSupabase().from('projects').update(patch).eq('id', projectId)
  if (error) throw error
}

/** Latest pipeline job for a stage — used to explain failed runs. */
export async function getLatestStageJob(projectId: string, stage: WorkflowStage): Promise<Job | null> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('id, stage, type, status, error, created_at, started_at, finished_at')
    .eq('project_id', projectId)
    .eq('stage', stage)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Jobs still queued/running for a project — restores the "AI working" UI after a page reload. */
export async function listActiveJobs(projectId: string): Promise<Job[]> {
  const { data, error } = await getSupabase()
    .from('jobs')
    .select('id, stage, type, status, error, created_at, started_at, finished_at')
    .eq('project_id', projectId)
    .in('status', ['queued', 'running'])
  if (error) throw error
  return data ?? []
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

// ===== Uploaded brand assets (storage + client_assets metadata) =====

const BRAND_BUCKET = 'brand-assets'

export async function listClientAssets(): Promise<ClientAsset[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('client_assets')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
  if (error) throw error

  const assets: ClientAsset[] = (data ?? []).map((row) => {
    const { clients, ...rest } = row
    return { ...rest, client_name: clients?.name }
  })

  // short-lived signed URLs for preview/download, per storage provider
  const supaAssets = assets.filter((a) => (a.storage_provider ?? 'supabase') === 'supabase')
  if (supaAssets.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BRAND_BUCKET)
      .createSignedUrls(supaAssets.map((a) => a.storage_path), 3600)
    signed?.forEach((s, i) => {
      if (s.signedUrl) supaAssets[i].signed_url = s.signedUrl
    })
  }

  const r2Assets = assets.filter((a) => a.storage_provider === 'r2')
  if (r2Assets.length > 0) {
    // if the orchestrator is unreachable, show the list without previews
    // rather than failing the whole page
    try {
      const urls = await getAssetViewUrls(r2Assets.map((a) => a.storage_path))
      r2Assets.forEach((a) => {
        if (urls[a.storage_path]) a.signed_url = urls[a.storage_path]
      })
    } catch {
      /* previews unavailable */
    }
  }
  return assets
}

export async function uploadClientAsset(
  agencyId: string,
  clientId: string,
  kind: ClientAssetKind,
  file: File,
): Promise<ClientAsset> {
  const supabase = getSupabase()
  const contentType = file.type || 'application/octet-stream'

  // Files go to Cloudflare R2 (no egress fees, real quota room) via a
  // presigned PUT from the orchestrator. null = R2 not configured yet →
  // fall back to Supabase Storage so uploads never hard-break.
  const presigned = await presignAssetUpload({
    clientId,
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
  })

  let storagePath: string
  let provider: 'supabase' | 'r2'
  if (presigned) {
    const putRes = await fetch(presigned.url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })
    if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`)
    storagePath = presigned.key
    provider = 'r2'
  } else {
    const safeName = file.name.replace(/[^\w.\-()\s]/g, '_')
    storagePath = `${agencyId}/${clientId}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage
      .from(BRAND_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
    if (uploadError) throw uploadError
    provider = 'supabase'
  }

  const { data, error } = await supabase
    .from('client_assets')
    .insert({
      agency_id: agencyId,
      client_id: clientId,
      kind,
      name: file.name,
      storage_path: storagePath,
      storage_provider: provider,
      mime_type: file.type || null,
      file_size: file.size,
    })
    .select()
    .single()
  if (error) {
    // don't leave an orphan file behind if the metadata insert failed
    if (provider === 'r2') {
      await deleteAssetObject(storagePath).catch(() => undefined)
    } else {
      await supabase.storage.from(BRAND_BUCKET).remove([storagePath]).catch(() => undefined)
    }
    throw error
  }
  return data
}

export async function deleteClientAsset(
  asset: Pick<ClientAsset, 'id' | 'storage_path' | 'storage_provider'>,
): Promise<void> {
  const supabase = getSupabase()
  if (asset.storage_provider === 'r2') {
    await deleteAssetObject(asset.storage_path)
  } else {
    const { error: storageError } = await supabase.storage.from(BRAND_BUCKET).remove([asset.storage_path])
    if (storageError) throw storageError
  }
  const { error } = await supabase.from('client_assets').delete().eq('id', asset.id)
  if (error) throw error
}

// ===== Share links & comments =====

// -- Agency side (authenticated) --

export async function createShareLink(projectId: string, title?: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_share_link', {
    p_project_id: projectId,
    p_title: title ?? null,
  })
  if (error) throw error
  return data as string
}

export async function listProjectShareLinks(projectId: string): Promise<ShareLink[]> {
  const { data, error } = await getSupabase()
    .from('share_links')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function setShareLinkActive(id: string, active: boolean): Promise<void> {
  const { error } = await getSupabase().from('share_links').update({ is_active: active }).eq('id', id)
  if (error) throw error
}

/** All comments across a project's share links, newest first (agency review). */
export async function listProjectComments(projectId: string): Promise<ShareComment[]> {
  const { data: links, error: linksError } = await getSupabase()
    .from('share_links')
    .select('id')
    .eq('project_id', projectId)
  if (linksError) throw linksError
  const ids = (links ?? []).map((l) => l.id)
  if (ids.length === 0) return []

  const { data, error } = await getSupabase()
    .from('share_comments')
    .select('*')
    .in('share_link_id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function setCommentResolved(id: string, resolved: boolean): Promise<void> {
  const { error } = await getSupabase().from('share_comments').update({ resolved }).eq('id', id)
  if (error) throw error
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await getSupabase().from('share_comments').delete().eq('id', id)
  if (error) throw error
}

// -- Public side (no auth required; uses the anon key + token) --

export async function getShare(token: string): Promise<SharedGallery | null> {
  const { data, error } = await getSupabase().rpc('get_share', { p_token: token })
  if (error) throw error
  return (data as SharedGallery) ?? null
}

export async function listShareComments(token: string): Promise<ShareComment[]> {
  const { data, error } = await getSupabase().rpc('list_share_comments', { p_token: token })
  if (error) throw error
  return (data as ShareComment[]) ?? []
}

export async function addShareComment(input: {
  token: string
  author: string
  body: string
  assetId?: string | null
  timestampSeconds?: number | null
}): Promise<void> {
  const { error } = await getSupabase().rpc('add_share_comment', {
    p_token: input.token,
    p_author: input.author,
    p_body: input.body,
    p_asset_id: input.assetId ?? null,
    p_timestamp_seconds: input.timestampSeconds ?? null,
  })
  if (error) throw error
}

// ===== Media assets =====

export async function listAssets(): Promise<MediaAsset[]> {
  const { data, error } = await getSupabase()
    .from('media_assets')
    .select('*, projects!inner(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  const assets: MediaAsset[] = (data ?? []).map((row) => {
    const { projects, ...rest } = row
    return { ...rest, project_name: projects?.name }
  })

  // generated media lives on R2 (url = object key) — swap in short-lived
  // view URLs; if the orchestrator is unreachable, show entries without previews
  const r2Keys = assets.filter((a) => a.url?.startsWith('generated/')).map((a) => a.url)
  if (r2Keys.length > 0) {
    try {
      const urls = await getAssetViewUrls(r2Keys)
      assets.forEach((a) => {
        const signed = urls[a.url]
        if (signed) {
          if (a.type === 'image' && !a.thumbnail_url) a.thumbnail_url = signed
          a.url = signed
        }
      })
    } catch {
      /* previews unavailable */
    }
  }
  return assets
}
