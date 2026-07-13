-- ============================================
-- Migration 003 — Pipeline v2, brand-asset uploads, jobs queue
-- ============================================

-- ============================================
-- 1. PIPELINE V2
-- Strategy is merged into Ideation; Editing is shelved for now.
-- The DB check constraints still allow the old stage names so
-- historical rows stay valid; new projects simply get 6 stages.
-- ============================================
create or replace function public.create_project_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_stages (project_id, stage, status, started_at, completed_at)
  values
    (new.id, 'discovery', 'completed', now(), now()),
    (new.id, 'research',  'pending', null, null),
    (new.id, 'ideation',  'pending', null, null),
    (new.id, 'scripts',   'pending', null, null),
    (new.id, 'shootplan', 'pending', null, null),
    (new.id, 'shooting',  'pending', null, null);
  return new;
end;
$$;

-- retire never-started strategy/editing rows on existing projects
delete from public.project_stages
where stage in ('strategy', 'editing') and status = 'pending' and content is null;

update public.projects set current_stage = 'ideation' where current_stage = 'strategy';
update public.projects set current_stage = 'shooting' where current_stage = 'editing';

-- ============================================
-- 2. BRAND ASSETS STORAGE (uploads: logos, product images, fonts…)
-- Private bucket. Object paths follow {agency_id}/{client_id}/{filename}
-- so RLS can scope every operation to the caller's agency.
-- Admin/debug access: the Supabase Dashboard storage browser and the
-- service role bypass RLS entirely.
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('brand-assets', 'brand-assets', false, 52428800) -- 50 MB per file
on conflict (id) do nothing;

create policy "Agency members read own brand assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = public.current_agency_id()::text
  );

create policy "Agency members upload own brand assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = public.current_agency_id()::text
  );

create policy "Agency members delete own brand assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = public.current_agency_id()::text
  );

-- ============================================
-- 3. CLIENT ASSETS metadata (sort/filter/manage layer over storage)
-- ============================================
create table if not exists public.client_assets (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('logo', 'product_image', 'font', 'reference', 'other')),
  name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size int,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.client_assets enable row level security;
revoke update on public.client_assets from anon, authenticated;
grant update (name, kind) on public.client_assets to authenticated;

create policy "Agency members view client assets"
  on public.client_assets for select
  using (agency_id = public.current_agency_id());

create policy "Agency members add client assets"
  on public.client_assets for insert
  with check (agency_id = public.current_agency_id());

create policy "Agency members update client assets"
  on public.client_assets for update
  using (agency_id = public.current_agency_id())
  with check (agency_id = public.current_agency_id());

create policy "Agency members delete client assets"
  on public.client_assets for delete
  using (agency_id = public.current_agency_id());

create index if not exists idx_client_assets_agency on public.client_assets(agency_id);
create index if not exists idx_client_assets_client on public.client_assets(client_id);

-- ============================================
-- 4. JOBS queue (orchestrator-ready)
-- Members can watch job status; only the orchestrator (service role)
-- creates and updates jobs.
-- ============================================
create table if not exists public.jobs (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  stage text,
  type text not null check (type in ('llm_generate', 'llm_revise', 'image_gen', 'image_edit', 'video_gen', 'tts')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  payload jsonb,
  result jsonb,
  error text,
  runpod_job_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);

alter table public.jobs enable row level security;
revoke insert, update, delete on public.jobs from anon, authenticated;

create policy "Agency members view jobs"
  on public.jobs for select
  using (agency_id = public.current_agency_id());

create index if not exists idx_jobs_agency on public.jobs(agency_id);
create index if not exists idx_jobs_project on public.jobs(project_id);
create index if not exists idx_jobs_status on public.jobs(status) where status in ('queued', 'running');

-- ============================================
-- 5. REALTIME — dashboard subscribes to stage + job updates
-- ============================================
alter publication supabase_realtime add table public.project_stages;
alter publication supabase_realtime add table public.jobs;
