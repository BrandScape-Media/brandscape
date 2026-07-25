export function timeAgo(iso?: string | null): string {
  if (!iso) return '—'
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** seconds → m:ss (for video comment timestamps) */
export function formatTimestamp(seconds?: number | null): string {
  if (seconds == null || seconds < 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Credits an agency can still spend: what's left of this cycle's plan
 * allowance, plus purchased credits (which roll over).
 *
 * Both the Billing page and the top-bar chip read this. They used to compute
 * it separately, which is exactly how two numbers on the same screen start
 * disagreeing. `used` and `limit` come from /v1/usage where available; the
 * agency row is the fallback for the sidebar, which doesn't fetch usage.
 */
export function creditsRemaining(
  used: number | null | undefined,
  limit: number | null | undefined,
  purchased: number | null | undefined,
): number {
  const allowanceLeft = Math.max((limit ?? 0) - (used ?? 0), 0)
  return allowanceLeft + (purchased ?? 0)
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
