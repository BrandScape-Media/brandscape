import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Tolerate common misconfigurations (trailing slashes/whitespace, or a
// pasted endpoint URL like https://xxx.supabase.co/rest/v1/) so a slightly
// wrong env value or CI secret can't break auth in production.
function normalizeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let url = raw.trim().replace(/\/+$/, '')
  url = url.replace(/\/(rest|auth|storage|realtime|functions)\/v1$/, '')
  return url
}

const supabaseUrl = normalizeUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10 && supabaseAnonKey.length > 10)
}

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Authentication is not configured on this deployment yet. Use demo mode, or contact support@brandscape.media.',
      )
    }
    _supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  }
  return _supabase
}
