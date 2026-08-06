-- Operational settings the founder can change from Mission Control without a
-- Railway redeploy.
--
-- The first tenant is `render_chain`: which generation backends to try, in
-- order, per media type. It exists because debugging a render meant editing an
-- env var and waiting for a deploy, and because a silent fallback to the local
-- ComfyUI is indistinguishable from "Runpod worked" unless you can pin the
-- chain to one backend and watch it fail.
--
-- Service-role only. There are deliberately NO policies: agencies must never
-- read or write platform operations config, and the orchestrator holds the
-- service key. RLS on with zero policies denies everyone else by default.

create table if not exists platform_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

alter table platform_settings enable row level security;

comment on table platform_settings is
  'Staff-editable operational config, service-role only. See 024_platform_settings.sql.';
comment on column platform_settings.value is
  'Free-form JSON per key. render_chain: {"image":["runpod","local"],"video":[...]}';

-- Seed the current behaviour so a fresh read never has to guess: Runpod first,
-- the founder''s local ComfyUI as the safety net.
insert into platform_settings (key, value)
values ('render_chain', '{"image":["runpod","local"],"video":["runpod","local"]}'::jsonb)
on conflict (key) do nothing;
