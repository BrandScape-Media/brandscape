-- 009: platform-admin flag for Brandscape staff (human QC / act-as-AI).
-- Column-level grants from 002 already limit authenticated updates on
-- profiles to (name, avatar_url), so users cannot self-promote; only the
-- service role (orchestrator) and the SQL editor can set this.
alter table public.profiles
  add column if not exists platform_admin boolean not null default false;

-- Grant it to a staff account (run manually per admin):
-- update public.profiles p set platform_admin = true
-- from auth.users u where u.id = p.id and u.email = '<staff email>';
