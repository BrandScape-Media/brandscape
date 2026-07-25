import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClients, useProjects } from '../../hooks/useData'
import { navGroups } from '../../data/dashboardNav'
import { useAuth } from '../../context/AuthContext'

/**
 * ⌘K jump-anywhere.
 *
 * The dashboard accumulates projects, clients and assets, and until now the
 * only way to reach any of them was to navigate to the right list first. Plain
 * substring matching, not fuzzy — an agency has tens of projects, not
 * thousands, and a dependency for that would be silly.
 */

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  to: string
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: projects } = useProjects()
  const { data: clients } = useClients()
  // Same nav the sidebar renders, minus anything this user can't reach —
  // offering a staff page to an agency would just 403 them.
  const destinations = useMemo(
    () => navGroups.filter((g) => !g.staffOnly || user?.platform_admin).flatMap((g) => g.items),
    [user?.platform_admin],
  )
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const match = (s: string) => !q || s.toLowerCase().includes(q)
    const out: Item[] = []

    for (const p of projects ?? []) {
      if (p.archived) continue
      if (match(p.name) || match(p.client_name ?? '')) {
        out.push({ id: `p-${p.id}`, group: 'Projects', label: p.name, hint: p.client_name ?? undefined, to: `/dashboard/projects/${p.id}` })
      }
    }
    for (const c of clients ?? []) {
      if (match(c.name)) {
        out.push({ id: `c-${c.id}`, group: 'Clients', label: c.name, hint: c.industry ?? undefined, to: '/dashboard/clients' })
      }
    }
    for (const d of destinations) {
      if (match(d.label)) out.push({ id: `d-${d.to}`, group: 'Go to', label: d.label, to: d.to })
    }
    if (match('new project')) {
      out.push({ id: 'a-new', group: 'Actions', label: 'New project', to: '/dashboard/projects/new' })
    }
    return out.slice(0, 40)
  }, [query, projects, clients, destinations])

  // Reset per opening, and focus the input. Without the reset, reopening lands
  // you back in the middle of the last search. On close, focus goes back where
  // it came from — otherwise dismissing with Esc drops you at the top of the
  // document and keyboard users lose their place.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    setQuery('')
    setCursor(0)
    // after the element is actually in the DOM
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      clearTimeout(t)
      opener?.focus?.()
    }
  }, [open])

  // Clamp when the result set shrinks under the cursor.
  useEffect(() => {
    setCursor((c) => (c >= items.length ? 0 : c))
  }, [items.length])

  // Keep the highlighted row on screen — arrowing past the fold otherwise
  // moves an invisible selection.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, items])

  if (!open) return null

  const go = (item?: Item) => {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => (items.length ? (c + 1) % items.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => (items.length ? (c - 1 + items.length) % items.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[cursor])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-xl bg-brand-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-4 border-b border-white/5">
          <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, clients and pages…"
            className="flex-1 bg-transparent py-4 text-sm font-heading text-white placeholder:text-brand-500 focus:outline-none"
          />
          <kbd className="text-[11px] font-heading text-brand-400 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-brand-400 text-sm font-heading">No matches</p>
          ) : (
            items.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null
              lastGroup = item.group
              const active = i === cursor
              return (
                <div key={item.id}>
                  {header && (
                    <p className="px-4 pt-3 pb-1 text-[11px] font-heading tracking-wider uppercase text-brand-500">{header}</p>
                  )}
                  <button
                    data-active={active}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className={`w-1 h-4 rounded-full flex-shrink-0 ${active ? 'bg-violet-400' : 'bg-transparent'}`} />
                    <span className="flex-1 min-w-0 truncate text-sm font-heading text-white">{item.label}</span>
                    {item.hint && <span className="text-brand-400 text-xs font-heading truncate max-w-[40%]">{item.hint}</span>}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/5 text-[11px] font-heading text-brand-400">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span className="ml-auto">{items.length} result{items.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  )
}
