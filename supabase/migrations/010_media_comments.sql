-- 010_media_comments.sql
-- Internal team feedback on generated media assets, with optional video
-- timestamps (e.g. "the logo pops in too late @ 0:04"). Agency-scoped via
-- RLS, mirroring media_assets visibility. This is the AGENCY-side thread;
-- client feedback from public share links stays in share_comments.

create table if not exists public.media_comments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null check (char_length(body) between 1 and 4000),
  timestamp_seconds integer check (timestamp_seconds is null or timestamp_seconds >= 0),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists media_comments_asset_id_idx on public.media_comments(asset_id);

alter table public.media_comments enable row level security;

-- A comment is in-agency when its asset's project belongs to the caller's agency.
create policy "Agency members can view media comments"
  on public.media_comments for select
  using (
    asset_id in (
      select ma.id from public.media_assets ma
      join public.projects p on p.id = ma.project_id
      where p.agency_id = current_agency_id()
    )
  );

create policy "Agency members can add media comments"
  on public.media_comments for insert
  with check (
    author_id = auth.uid()
    and asset_id in (
      select ma.id from public.media_assets ma
      join public.projects p on p.id = ma.project_id
      where p.agency_id = current_agency_id()
    )
  );

create policy "Agency members can update media comments"
  on public.media_comments for update
  using (
    asset_id in (
      select ma.id from public.media_assets ma
      join public.projects p on p.id = ma.project_id
      where p.agency_id = current_agency_id()
    )
  );

create policy "Agency members can delete media comments"
  on public.media_comments for delete
  using (
    asset_id in (
      select ma.id from public.media_assets ma
      join public.projects p on p.id = ma.project_id
      where p.agency_id = current_agency_id()
    )
  );
