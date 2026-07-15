-- 008: uploads move to Cloudflare R2 (Supabase free-tier storage is 1 GB).
-- Tracks where each asset's bytes live so old Supabase uploads keep working.
alter table public.client_assets
  add column if not exists storage_provider text not null default 'supabase'
  check (storage_provider in ('supabase', 'r2'));
