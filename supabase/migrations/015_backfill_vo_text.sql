-- ============================================
-- Migration 015 — Backfill voiceover text onto legacy audio assets
-- --------------------------------------------
-- The Raws Audio tab shows each VO line's wording from
-- media_assets.metadata->>'text'. Audio produced by an older runner
-- (source 'pipeline') never stored that field, so those cards showed an
-- empty box even though the clip plays. The canonical wording still lives
-- in the scripts stage's structured output (stage_internal.raw_prompts
-- -> data -> vo, keyed by the VO id). Copy it back so existing projects
-- read correctly. Current code always writes `text`, so this is a one-off.
-- ============================================

update public.media_assets ma
set metadata = ma.metadata
  || jsonb_build_object('text', si.raw_prompts->'data'->'vo'->>(ma.metadata->>'vo'))
from public.stage_internal si
where ma.type = 'audio'
  and ma.status = 'completed'
  and (ma.metadata->>'text') is null
  and ma.metadata ? 'vo'
  and si.project_id = ma.project_id
  and si.stage = 'scripts'
  and (si.raw_prompts->'data'->'vo') ? (ma.metadata->>'vo');
