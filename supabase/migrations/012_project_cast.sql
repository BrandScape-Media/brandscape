-- 012_project_cast.sql
-- The cast: which influencer performs a project's videos. Written when the
-- shoot plan names one, overridable by the agency. The shooting runner and
-- every generated video read the persona + voice from here, so the same
-- face/voice persists across the whole campaign.
--
-- ON DELETE SET NULL: retiring an influencer unbinds projects rather than
-- deleting them. RLS on projects already scopes reads to the agency.

alter table public.projects
  add column if not exists influencer_id uuid references public.influencers(id) on delete set null;
