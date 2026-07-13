-- ============================================
-- Migration 002 — Security fixes & agency onboarding
-- Run this in the Supabase SQL Editor on the existing database
-- (001_initial_schema.sql must already be applied).
-- ============================================

-- ============================================
-- 1. HELPER FUNCTIONS
-- security definer so RLS policies can look up the caller's
-- agency/role without recursing into the profiles policies
-- ============================================
create or replace function public.current_agency_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select agency_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============================================
-- 2. PROFILES — close the privilege-escalation hole
-- Previously any user could UPDATE their own agency_id/role/plan,
-- which granted access to any other agency's data.
-- ============================================

-- plan lives on agencies; the duplicate on profiles invites drift
alter table public.profiles drop column if exists plan;

-- users may only change their display fields; agency_id/role are
-- managed exclusively by security-definer functions / service role
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- members can see teammates' profiles (needed for team features)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own or agency profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or (agency_id is not null and agency_id = public.current_agency_id())
  );

-- keep the row-level rule: you can only update your own row
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================
-- 3. AGENCIES — creation via RPC, edits restricted
-- ============================================
revoke insert, update, delete on public.agencies from anon, authenticated;
grant update (name, industry) on public.agencies to authenticated;

drop policy if exists "Agency members can view agency" on public.agencies;
create policy "Agency members can view agency"
  on public.agencies for select
  using (id = public.current_agency_id());

create policy "Owners and admins can update agency"
  on public.agencies for update
  using (id = public.current_agency_id() and public.current_user_role() in ('owner', 'admin'))
  with check (id = public.current_agency_id());

-- Onboarding: creates the agency and promotes the caller to owner
-- atomically. Bypasses the column revokes above because it runs as
-- the function owner (security definer).
create or replace function public.create_agency(agency_name text, agency_industry text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_agency_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from public.profiles where id = uid and agency_id is not null) then
    raise exception 'You already belong to an agency';
  end if;
  if agency_name is null or length(trim(agency_name)) < 2 then
    raise exception 'Agency name must be at least 2 characters';
  end if;

  insert into public.agencies (name, industry, billing_cycle_start, trial_ends_at)
  values (trim(agency_name), nullif(trim(agency_industry), ''), current_date, now() + interval '14 days')
  returning id into new_agency_id;

  update public.profiles
  set agency_id = new_agency_id, role = 'owner'
  where id = uid;

  return new_agency_id;
end;
$$;

revoke execute on function public.create_agency(text, text) from public, anon;
grant execute on function public.create_agency(text, text) to authenticated;

-- ============================================
-- 4. CLIENTS — rewrite policies with helpers, add delete,
--    prevent moving a client to another agency
-- ============================================
revoke update on public.clients from anon, authenticated;
grant update (name, industry, website, brand_guidelines, target_audience) on public.clients to authenticated;

drop policy if exists "Agency members can view clients" on public.clients;
drop policy if exists "Agency members can insert clients" on public.clients;
drop policy if exists "Agency members can update clients" on public.clients;

create policy "Agency members can view clients"
  on public.clients for select
  using (agency_id = public.current_agency_id());

create policy "Agency members can insert clients"
  on public.clients for insert
  with check (agency_id = public.current_agency_id());

create policy "Agency members can update clients"
  on public.clients for update
  using (agency_id = public.current_agency_id())
  with check (agency_id = public.current_agency_id());

create policy "Owners and admins can delete clients"
  on public.clients for delete
  using (agency_id = public.current_agency_id() and public.current_user_role() in ('owner', 'admin'));

-- ============================================
-- 5. PROJECTS — same treatment
-- ============================================
revoke update on public.projects from anon, authenticated;
grant update (name, current_stage, discovery_data) on public.projects to authenticated;

drop policy if exists "Agency members can manage projects" on public.projects;

create policy "Agency members can view projects"
  on public.projects for select
  using (agency_id = public.current_agency_id());

create policy "Agency members can insert projects"
  on public.projects for insert
  with check (agency_id = public.current_agency_id());

create policy "Agency members can update projects"
  on public.projects for update
  using (agency_id = public.current_agency_id())
  with check (agency_id = public.current_agency_id());

create policy "Owners and admins can delete projects"
  on public.projects for delete
  using (agency_id = public.current_agency_id() and public.current_user_role() in ('owner', 'admin'));

-- ============================================
-- 6. PROJECT STAGES — members edit content/status only;
--    rows are created automatically (see trigger below)
-- NOTE: once the orchestrator backend exists, tighten `status`
-- to service-role-only.
-- ============================================
revoke insert, update, delete on public.project_stages from anon, authenticated;
grant update (content, status, started_at, completed_at) on public.project_stages to authenticated;

drop policy if exists "Agency members can manage stages" on public.project_stages;

create policy "Agency members can view stages"
  on public.project_stages for select
  using (
    project_id in (select id from public.projects where agency_id = public.current_agency_id())
  );

create policy "Agency members can update stages"
  on public.project_stages for update
  using (
    project_id in (select id from public.projects where agency_id = public.current_agency_id())
  );

-- Auto-create the 8 pipeline stages when a project is created
create or replace function public.create_project_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_stages (project_id, stage, status, started_at)
  values
    (new.id, 'discovery', 'completed', now()),
    (new.id, 'research',  'pending', null),
    (new.id, 'ideation',  'pending', null),
    (new.id, 'strategy',  'pending', null),
    (new.id, 'scripts',   'pending', null),
    (new.id, 'shootplan', 'pending', null),
    (new.id, 'shooting',  'pending', null),
    (new.id, 'editing',   'pending', null);
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.create_project_stages();

-- Discovery is completed at creation time (the form IS the stage),
-- so stamp its completion too
update public.project_stages set completed_at = created_at where stage = 'discovery' and completed_at is null;

-- ============================================
-- 7. MEDIA ASSETS — read-only for members; only the backend
--    (service role) writes generated assets
-- ============================================
revoke insert, update, delete on public.media_assets from anon, authenticated;

drop policy if exists "Agency members can manage assets" on public.media_assets;

create policy "Agency members can view assets"
  on public.media_assets for select
  using (
    project_id in (select id from public.projects where agency_id = public.current_agency_id())
  );

-- ============================================
-- 8. USAGE LOGS — read-only for members (writes: service role)
-- ============================================
revoke insert, update, delete on public.usage_logs from anon, authenticated;

drop policy if exists "Agency members can view usage" on public.usage_logs;
create policy "Agency members can view usage"
  on public.usage_logs for select
  using (agency_id = public.current_agency_id());

-- ============================================
-- 9. AI CONVERSATIONS — members read/write on own projects
-- ============================================
drop policy if exists "Agency members can manage conversations" on public.ai_conversations;

create policy "Agency members can manage conversations"
  on public.ai_conversations for all
  using (
    project_id in (select id from public.projects where agency_id = public.current_agency_id())
  )
  with check (
    project_id in (select id from public.projects where agency_id = public.current_agency_id())
  );

-- ============================================
-- 10. STAGE INTERNAL — server-side-only storage for system
--     prompts and raw generation prompts. RLS is enabled with NO
--     user policies: only the service role (orchestrator) can
--     read or write. Agencies only ever see `prompt_summary`,
--     which the backend copies into project_stages.content.
-- ============================================
create table if not exists public.stage_internal (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  stage text not null check (
    stage in ('discovery', 'research', 'ideation', 'strategy', 'scripts', 'shootplan', 'shooting', 'editing')
  ),
  system_prompt text,
  raw_prompts jsonb,
  prompt_summary text,
  model_config jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, stage)
);

alter table public.stage_internal enable row level security;
revoke all on public.stage_internal from anon, authenticated;

create trigger update_stage_internal_updated_at
  before update on public.stage_internal
  for each row execute procedure public.update_updated_at();

-- ============================================
-- 11. INDEXES on the foreign keys every policy filters through
-- ============================================
create index if not exists idx_profiles_agency on public.profiles(agency_id);
create index if not exists idx_clients_agency on public.clients(agency_id);
create index if not exists idx_projects_agency on public.projects(agency_id);
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_project_stages_project on public.project_stages(project_id);
create index if not exists idx_media_assets_project on public.media_assets(project_id);
create index if not exists idx_usage_logs_agency on public.usage_logs(agency_id);
create index if not exists idx_ai_conversations_project on public.ai_conversations(project_id);
create index if not exists idx_stage_internal_project on public.stage_internal(project_id);
