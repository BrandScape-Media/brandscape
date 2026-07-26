-- ============================================
-- Migration 023 — Agency invites (team seats)
--
-- Multi-user agencies have worked since 001: profiles carries agency_id and
-- role, and every RLS policy keys off current_agency_id() rather than a user
-- id. There was simply no way to JOIN an existing agency — onboarding could
-- only ever create a new one, so every account was an island.
--
-- Same tokenized pattern as share_links (005), with one deliberate
-- difference: a share link is a read-only gallery, while an invite grants
-- full member access to every client and project in the agency. A leaked
-- unbound link would therefore be a data breach, so invites are BOUND TO AN
-- EMAIL and accept_invite refuses anyone else.
-- ============================================

create table if not exists public.agency_invites (
  id uuid default gen_random_uuid() primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  -- who it's for; the accepting session's email must match
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- one live invite per address per agency; a re-invite replaces it
create unique index if not exists agency_invites_pending_unique
  on public.agency_invites (agency_id, lower(email))
  where accepted_at is null;

create index if not exists agency_invites_agency_idx
  on public.agency_invites (agency_id, created_at desc);

alter table public.agency_invites enable row level security;

-- Everything goes through the SECURITY DEFINER RPCs below. In particular the
-- token is never exposed to a plain select — an authenticated member of ANY
-- agency could otherwise read tokens and walk into someone else's.
revoke all on public.agency_invites from anon, authenticated;

-- ============================================
-- Owner/admin RPC: invite someone
-- ============================================
create or replace function public.create_agency_invite(p_email text, p_role text default 'member')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency uuid := public.current_agency_id();
  v_role text := public.current_user_role();
  v_email text := lower(trim(p_email));
  v_token text;
begin
  if v_agency is null then
    raise exception 'Not authorized';
  end if;
  if v_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can invite people';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That does not look like an email address';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Role must be admin or member';
  end if;
  -- Already inside this agency? Nothing to do, and an invite they could never
  -- accept (accept_invite refuses anyone who already has an agency) would
  -- just sit there looking broken.
  if exists (
    select 1 from public.profiles
    where agency_id = v_agency and lower(email) = v_email
  ) then
    raise exception 'That person is already in your agency';
  end if;

  -- re-inviting replaces the pending one rather than tripping the index
  delete from public.agency_invites
  where agency_id = v_agency and lower(email) = v_email and accepted_at is null;

  insert into public.agency_invites (agency_id, email, role, invited_by)
  values (v_agency, v_email, p_role, auth.uid())
  returning token into v_token;

  return v_token;
end;
$$;

revoke execute on function public.create_agency_invite(text, text) from public, anon;
grant execute on function public.create_agency_invite(text, text) to authenticated;

-- ============================================
-- RPC: what does this token offer me?
-- Read-only preview so the accept page can name the agency before the click.
-- ============================================
create or replace function public.peek_agency_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.agency_invites;
  v_agency_name text;
begin
  select * into v_invite from public.agency_invites where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_invite.accepted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_accepted');
  end if;
  if v_invite.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select name into v_agency_name from public.agencies where id = v_invite.agency_id;

  return jsonb_build_object(
    'ok', true,
    'agency_name', v_agency_name,
    'email', v_invite.email,
    'role', v_invite.role
  );
end;
$$;

revoke execute on function public.peek_agency_invite(text) from public, anon;
grant execute on function public.peek_agency_invite(text) to authenticated;

-- ============================================
-- RPC: join the agency
-- ============================================
create or replace function public.accept_agency_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.agency_invites;
  v_me public.profiles;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  -- lock it: two tabs racing on the same token must not both succeed
  select * into v_invite from public.agency_invites where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_invite.accepted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_accepted');
  end if;
  if v_invite.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select * into v_me from public.profiles where id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_profile');
  end if;

  -- The whole reason invites carry an address: the token alone must not be
  -- enough, or forwarding the link hands over the agency's client data.
  if lower(v_me.email) is distinct from lower(v_invite.email) then
    return jsonb_build_object('ok', false, 'error', 'wrong_account', 'email', v_invite.email);
  end if;

  -- Moving someone between agencies would silently orphan whatever they
  -- created in the first one. Leaving is a separate, deliberate action.
  if v_me.agency_id is not null and v_me.agency_id <> v_invite.agency_id then
    return jsonb_build_object('ok', false, 'error', 'already_in_agency');
  end if;

  update public.profiles
  set agency_id = v_invite.agency_id,
      role = v_invite.role,
      updated_at = now()
  where id = auth.uid();

  update public.agency_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_invite.id;

  return jsonb_build_object('ok', true, 'agency_id', v_invite.agency_id);
end;
$$;

revoke execute on function public.accept_agency_invite(text) from public, anon;
grant execute on function public.accept_agency_invite(text) to authenticated;

-- ============================================
-- Owner/admin RPCs: list and revoke
-- The list deliberately omits the token — it is write-once, shown at the
-- moment of creation and never readable again.
-- ============================================
create or replace function public.list_agency_invites()
returns table (
  id uuid,
  email text,
  role text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select i.id, i.email, i.role, i.expires_at, i.created_at
  from public.agency_invites i
  where i.agency_id = public.current_agency_id()
    and i.accepted_at is null
    and public.current_user_role() in ('owner', 'admin')
  order by i.created_at desc
$$;

revoke execute on function public.list_agency_invites() from public, anon;
grant execute on function public.list_agency_invites() to authenticated;

create or replace function public.revoke_agency_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('owner', 'admin') then
    raise exception 'Only owners and admins can revoke invites';
  end if;
  delete from public.agency_invites
  where id = p_id and agency_id = public.current_agency_id() and accepted_at is null;
end;
$$;

revoke execute on function public.revoke_agency_invite(uuid) from public, anon;
grant execute on function public.revoke_agency_invite(uuid) to authenticated;

-- ============================================
-- Owner RPC: remove a member
-- Nulls their agency_id — nothing they made is deleted, it stays with the
-- agency, exactly like a lapsed subscription keeps its work.
-- ============================================
create or replace function public.remove_agency_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency uuid := public.current_agency_id();
begin
  if public.current_user_role() not in ('owner', 'admin') then
    raise exception 'Only owners and admins can remove people';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself';
  end if;
  -- an agency with no owner can never invite anyone again
  if exists (
    select 1 from public.profiles
    where id = p_user_id and agency_id = v_agency and role = 'owner'
  ) then
    raise exception 'The owner cannot be removed';
  end if;

  update public.profiles
  set agency_id = null, role = 'member', updated_at = now()
  where id = p_user_id and agency_id = v_agency;
end;
$$;

revoke execute on function public.remove_agency_member(uuid) from public, anon;
grant execute on function public.remove_agency_member(uuid) to authenticated;
