-- ============================================
-- Migration 005 — Client share links + timestamped comments
-- Agencies share a project's media with their clients via a tokenized
-- link. Clients (unauthenticated) view the gallery and leave comments —
-- optionally pinned to a video timestamp. All public access goes through
-- SECURITY DEFINER RPCs that validate the token; no table is exposed to
-- the anon role directly.
-- ============================================

create table if not exists public.share_links (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  title text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.share_comments (
  id uuid default gen_random_uuid() primary key,
  share_link_id uuid not null references public.share_links(id) on delete cascade,
  asset_id uuid,                       -- which media asset (loose ref; assets may be regenerated)
  author_name text not null,
  body text not null,
  timestamp_seconds numeric,           -- video position the comment is pinned to, if any
  resolved boolean not null default false,
  created_at timestamptz default now()
);

alter table public.share_links enable row level security;
alter table public.share_comments enable row level security;
revoke all on public.share_links from anon, authenticated;
revoke all on public.share_comments from anon, authenticated;

-- Agency side: members manage their own links and comments
grant select, delete on public.share_links to authenticated;
grant update (is_active, title) on public.share_links to authenticated;
grant select, delete on public.share_comments to authenticated;
grant update (resolved) on public.share_comments to authenticated;

create policy "Agency members view own share links"
  on public.share_links for select
  using (agency_id = public.current_agency_id());

create policy "Agency members update own share links"
  on public.share_links for update
  using (agency_id = public.current_agency_id())
  with check (agency_id = public.current_agency_id());

create policy "Agency members delete own share links"
  on public.share_links for delete
  using (agency_id = public.current_agency_id());

create policy "Agency members view comments on own links"
  on public.share_comments for select
  using (share_link_id in (select id from public.share_links where agency_id = public.current_agency_id()));

create policy "Agency members update comments on own links"
  on public.share_comments for update
  using (share_link_id in (select id from public.share_links where agency_id = public.current_agency_id()))
  with check (share_link_id in (select id from public.share_links where agency_id = public.current_agency_id()));

create policy "Agency members delete comments on own links"
  on public.share_comments for delete
  using (share_link_id in (select id from public.share_links where agency_id = public.current_agency_id()));

create index if not exists idx_share_links_agency on public.share_links(agency_id);
create index if not exists idx_share_links_project on public.share_links(project_id);
create index if not exists idx_share_comments_link on public.share_comments(share_link_id);

-- ============================================
-- Agency RPC: create a share link for a project
-- ============================================
create or replace function public.create_share_link(p_project_id uuid, p_title text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency uuid := public.current_agency_id();
  v_token text;
begin
  if v_agency is null then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from public.projects where id = p_project_id and agency_id = v_agency) then
    raise exception 'Project not found';
  end if;

  insert into public.share_links (agency_id, project_id, title, created_by)
  values (v_agency, p_project_id, nullif(trim(p_title), ''), auth.uid())
  returning token into v_token;

  return v_token;
end;
$$;

revoke execute on function public.create_share_link(uuid, text) from public, anon;
grant execute on function public.create_share_link(uuid, text) to authenticated;

-- ============================================
-- Public RPC: fetch a shared gallery by token (no auth)
-- ============================================
create or replace function public.get_share(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links;
  v_result jsonb;
begin
  select * into v_link from public.share_links where token = p_token and is_active = true;
  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'title', coalesce(v_link.title, p.name),
    'project_name', p.name,
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'type', m.type,
        'url', m.url,
        'thumbnail_url', m.thumbnail_url,
        'name', coalesce(m.metadata->>'name', m.type),
        'created_at', m.created_at
      ) order by m.created_at)
      from public.media_assets m
      where m.project_id = v_link.project_id and m.status = 'completed'
    ), '[]'::jsonb)
  ) into v_result
  from public.projects p where p.id = v_link.project_id;

  return v_result;
end;
$$;

revoke execute on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;

-- ============================================
-- Public RPC: list comments for a shared link (no auth)
-- ============================================
create or replace function public.list_share_comments(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
begin
  select id into v_link_id from public.share_links where token = p_token and is_active = true;
  if v_link_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'asset_id', c.asset_id,
      'author_name', c.author_name,
      'body', c.body,
      'timestamp_seconds', c.timestamp_seconds,
      'resolved', c.resolved,
      'created_at', c.created_at
    ) order by c.created_at)
    from public.share_comments c
    where c.share_link_id = v_link_id
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.list_share_comments(text) from public;
grant execute on function public.list_share_comments(text) to anon, authenticated;

-- ============================================
-- Public RPC: add a comment (no auth) — validates + clamps input
-- ============================================
create or replace function public.add_share_comment(
  p_token text,
  p_author text,
  p_body text,
  p_asset_id uuid default null,
  p_timestamp_seconds numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
  v_id uuid;
begin
  select id into v_link_id from public.share_links where token = p_token and is_active = true;
  if v_link_id is null then
    raise exception 'This share link is not available';
  end if;
  if p_author is null or length(trim(p_author)) = 0 then
    raise exception 'A name is required';
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'Comment cannot be empty';
  end if;

  insert into public.share_comments (share_link_id, asset_id, author_name, body, timestamp_seconds)
  values (
    v_link_id,
    p_asset_id,
    left(trim(p_author), 80),
    left(trim(p_body), 2000),
    case when p_timestamp_seconds is not null and p_timestamp_seconds >= 0 then p_timestamp_seconds else null end
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end;
$$;

revoke execute on function public.add_share_comment(text, text, text, uuid, numeric) from public;
grant execute on function public.add_share_comment(text, text, text, uuid, numeric) to anon, authenticated;
