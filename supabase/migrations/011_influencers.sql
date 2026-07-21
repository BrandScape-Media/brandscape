-- 011_influencers.sql
-- Curated influencer library for the media-generation pipeline. An
-- influencer = one persona: a fixed ElevenLabs voice + several reference
-- images (same face, different clothing/background). Picking the
-- influencer picks the voice — voice consistency by construction.
--
-- PLATFORM-level data (not agency-scoped): Brandscape staff curate it via
-- the orchestrator's admin routes (service role); agencies get read-only
-- access so project UIs can show which persona a campaign uses.

create table if not exists public.influencers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  gender text not null check (gender in ('female', 'male')),
  age_bracket text not null check (age_bracket in ('18-25', '26-35', '36-50', '50+')),
  -- ElevenLabs voice: editable while the library is being curated
  voice_id text,
  voice_name text,
  tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.influencer_images (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  r2_key text not null,
  label text check (label is null or char_length(label) <= 80),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists influencer_images_influencer_id_idx
  on public.influencer_images(influencer_id);

alter table public.influencers enable row level security;
alter table public.influencer_images enable row level security;

-- Read-only for signed-in agency users; ALL writes go through the
-- orchestrator's platform-admin routes (service role bypasses RLS).
create policy "Authenticated users can view influencers"
  on public.influencers for select
  to authenticated
  using (true);

create policy "Authenticated users can view influencer images"
  on public.influencer_images for select
  to authenticated
  using (true);
