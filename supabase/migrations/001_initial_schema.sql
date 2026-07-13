-- ============================================
-- Brandscape Supabase Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null,
  avatar_url text,
  agency_id uuid,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  plan text default 'starter' check (plan in ('starter', 'professional', 'enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- AGENCIES
-- ============================================
create table public.agencies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  industry text,
  plan text not null default 'starter' check (plan in ('starter', 'professional', 'enterprise')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  usage_generations int default 0,
  usage_revisions int default 0,
  usage_storage int default 0,
  billing_cycle_start date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add foreign key from profiles to agencies
alter table public.profiles
  add constraint profiles_agency_id_fkey
  foreign key (agency_id) references public.agencies(id) on delete set null;

-- ============================================
-- CLIENTS
-- ============================================
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid references public.agencies(id) on delete cascade not null,
  name text not null,
  industry text,
  website text,
  brand_guidelines jsonb,
  target_audience text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PROJECTS
-- ============================================
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid references public.agencies(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  current_stage text not null default 'discovery' check (
    current_stage in ('discovery', 'research', 'ideation', 'strategy', 'scripts', 'shootplan', 'shooting', 'editing')
  ),
  discovery_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PROJECT STAGES
-- ============================================
create table public.project_stages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  stage text not null check (
    stage in ('discovery', 'research', 'ideation', 'strategy', 'scripts', 'shootplan', 'shooting', 'editing')
  ),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'revision')),
  content jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(project_id, stage)
);

-- ============================================
-- MEDIA ASSETS
-- ============================================
create table public.media_assets (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  type text not null check (type in ('image', 'video', 'audio')),
  status text not null default 'pending' check (status in ('pending', 'generating', 'completed', 'failed')),
  url text not null,
  thumbnail_url text,
  metadata jsonb,
  file_size int,
  generation_id text, -- Runpod generation ID
  created_at timestamptz default now()
);

-- ============================================
-- USAGE LOGS
-- ============================================
create table public.usage_logs (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid references public.agencies(id) on delete cascade not null,
  type text not null check (type in ('generation', 'revision', 'storage')),
  amount int not null default 1,
  project_id uuid references public.projects(id) on delete set null,
  details jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- AI CONVERSATIONS (for stage revisions)
-- ============================================
create table public.ai_conversations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  stage text not null,
  messages jsonb not null default '[]',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.media_assets enable row level security;
alter table public.usage_logs enable row level security;
alter table public.ai_conversations enable row level security;

-- Profiles: Users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Agencies: Members can read their agency
create policy "Agency members can view agency"
  on public.agencies for select
  using (
    id in (select agency_id from public.profiles where id = auth.uid())
  );

-- Clients: Agency members can view and manage clients
create policy "Agency members can view clients"
  on public.clients for select
  using (
    agency_id in (select agency_id from public.profiles where id = auth.uid())
  );

create policy "Agency members can insert clients"
  on public.clients for insert
  with check (
    agency_id in (select agency_id from public.profiles where id = auth.uid())
  );

create policy "Agency members can update clients"
  on public.clients for update
  using (
    agency_id in (select agency_id from public.profiles where id = auth.uid())
  );

-- Projects: Agency members can manage projects
create policy "Agency members can manage projects"
  on public.projects for all
  using (
    agency_id in (select agency_id from public.profiles where id = auth.uid())
  );

-- Project Stages: Agency members can manage stages
create policy "Agency members can manage stages"
  on public.project_stages for all
  using (
    project_id in (
      select id from public.projects
      where agency_id in (select agency_id from public.profiles where id = auth.uid())
    )
  );

-- Media Assets: Agency members can manage assets
create policy "Agency members can manage assets"
  on public.media_assets for all
  using (
    project_id in (
      select id from public.projects
      where agency_id in (select agency_id from public.profiles where id = auth.uid())
    )
  );

-- Usage Logs: Agency members can view logs
create policy "Agency members can view usage"
  on public.usage_logs for select
  using (
    agency_id in (select agency_id from public.profiles where id = auth.uid())
  );

-- AI Conversations: Agency members can manage conversations
create policy "Agency members can manage conversations"
  on public.ai_conversations for all
  using (
    project_id in (
      select id from public.projects
      where agency_id in (select agency_id from public.profiles where id = auth.uid())
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'User')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger update_agencies_updated_at
  before update on public.agencies
  for each row execute procedure public.update_updated_at();

create trigger update_clients_updated_at
  before update on public.clients
  for each row execute procedure public.update_updated_at();

create trigger update_projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these via the Supabase Dashboard or API:
--
-- insert into storage.buckets (id, name, public) values ('brand-assets', 'brand-assets', false);
-- insert into storage.buckets (id, name, public) values ('generated-content', 'generated-content', false);
-- insert into storage.buckets (id, name, public) values ('client-libraries', 'client-libraries', true);
