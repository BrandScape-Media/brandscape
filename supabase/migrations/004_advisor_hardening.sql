-- ============================================
-- Migration 004 — Security-advisor hardening
-- ============================================

-- anon (logged-out) traffic has no business touching app tables at all
revoke all on public.profiles,
              public.agencies,
              public.clients,
              public.projects,
              public.project_stages,
              public.media_assets,
              public.usage_logs,
              public.ai_conversations,
              public.client_assets,
              public.jobs,
              public.stage_internal
from anon;

-- trigger functions are fired internally — nobody needs RPC access to them
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_project_stages() from public, anon, authenticated;
revoke execute on function public.update_updated_at() from public, anon, authenticated;

-- RLS helpers: `authenticated` must keep EXECUTE (policies evaluate them
-- with the caller's privileges), but anon and public don't need them
revoke execute on function public.current_agency_id() from public, anon;
revoke execute on function public.current_user_role() from public, anon;

-- pin the search_path the advisor flagged as mutable
alter function public.update_updated_at() set search_path = public;
