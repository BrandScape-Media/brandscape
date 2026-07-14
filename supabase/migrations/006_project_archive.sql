-- ============================================
-- Migration 006 — Project archiving
-- ============================================
alter table public.projects add column if not exists archived boolean not null default false;

-- extend the member-updatable column set (additive to migration 002's grant)
grant update (archived) on public.projects to authenticated;

create index if not exists idx_projects_agency_archived on public.projects(agency_id, archived);
