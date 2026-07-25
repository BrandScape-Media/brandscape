import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useBreadcrumb } from '../../context/BreadcrumbContext'
import { useActiveJobs, useAgency } from '../../hooks/useData'
import { navItemForPath } from '../../data/dashboardNav'
import { getUsage } from '../../lib/orchestrator'
import { demoUsage } from '../../data/demo'
import { planFor } from '../../data/plans'
import { creditsRemaining } from '../../lib/format'
import type { UsageSnapshot } from '../../types'

/**
 * The dashboard's top bar.
 *
 * It used to hold a hamburger and a "View website" link — 64px of chrome doing
 * almost nothing while the app ran long jobs you could only see from the page
 * that started them. Now it answers four questions at a glance: where am I,
 * how do I get somewhere else, what's running, and what is it costing me.
 */
export default function TopBar({
  onToggleMobile,
  onOpenSearch,
}: {
  onToggleMobile: () => void
  onOpenSearch: () => void
}) {
  const { user, signOut, demoMode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const crumbs = useBreadcrumb()
  const { data: agency } = useAgency()
  const { data: jobs } = useActiveJobs()
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const jobCount = (jobs ?? []).length

  // Same source the Billing page reads, so the chip and the page can't
  // disagree. The layout outlives route changes, so this doesn't refire as you
  // navigate — it refires when the number of running jobs changes, because
  // that's what actually spends credits. Realtime drives that count, so the
  // chip drops on its own when a shoot finishes.
  useEffect(() => {
    if (demoMode) {
      setUsage(demoUsage())
      return
    }
    let cancelled = false
    void getUsage()
      .then((u) => {
        if (!cancelled) setUsage(u)
      })
      .catch(() => {
        /* the chip is informational — a failure just hides it */
      })
    return () => {
      cancelled = true
    }
  }, [demoMode, jobCount])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // A page that publishes its own trail wins; everything else is named by the
  // nav item it lives under.
  const trail = useMemo(() => {
    if (crumbs.length > 0) return crumbs
    const item = navItemForPath(location.pathname)
    return item ? [{ label: item.label }] : []
  }, [crumbs, location.pathname])

  const running = jobCount
  const firstJob = (jobs ?? [])[0]

  const credits = usage
    ? creditsRemaining(usage.meters.credits.used, usage.meters.credits.limit, usage.credit_balance)
    : null
  const shootCost = usage?.credits_per_project_shoot || 150
  const creditTone =
    credits === null || credits > shootCost
      ? 'border-violet-400/30 bg-violet-400/10 text-violet-200 hover:border-violet-400/60'
      : credits <= 0
        ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-500/60'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-500/60'

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-brand-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-3">
      <button
        onClick={onToggleMobile}
        className="lg:hidden text-brand-300 hover:text-white transition-colors flex-shrink-0"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Where you are */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 min-w-0">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1
          return (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-2 min-w-0">
              {i > 0 && (
                <svg className="w-3 h-3 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {crumb.to && !last ? (
                <Link to={crumb.to} className="text-brand-400 hover:text-white text-sm font-heading transition-colors truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className={`text-sm font-heading truncate ${last ? 'text-white' : 'text-brand-400'}`}>{crumb.label}</span>
              )}
            </span>
          )
        })}
      </nav>

      {demoMode && (
        <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-amber-300 text-[11px] font-heading font-bold tracking-wider">DEMO</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Jump anywhere */}
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 border border-white/10 rounded-lg text-brand-400 hover:text-white hover:border-white/25 transition-colors flex-shrink-0"
        aria-label="Search"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <span className="hidden md:inline text-sm font-heading">Search</span>
        <kbd className="hidden md:inline text-[11px] font-heading border border-white/10 rounded px-1.5 py-0.5">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>

      {/* What's running — hidden entirely at zero, since "0 running" is noise */}
      {running > 0 && (
        <Link
          to={firstJob?.project_id ? `/dashboard/projects/${firstJob.project_id}` : '/dashboard/projects'}
          title={firstJob?.project_name ? `Running on ${firstJob.project_name}` : 'AI jobs in progress'}
          className="flex items-center gap-2 px-2.5 py-1.5 border border-blue-500/25 bg-blue-500/10 rounded-lg hover:border-blue-500/50 transition-colors flex-shrink-0"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-200 text-[11px] font-heading font-bold tracking-wider">
            {running} RUNNING
          </span>
        </Link>
      )}

      {/* What it's costing */}
      {credits !== null && (
        <Link
          to="/dashboard/billing"
          title={`${credits.toLocaleString()} credits remaining`}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-colors flex-shrink-0 ${creditTone}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[11px] font-heading font-bold tracking-wider">{credits.toLocaleString()}</span>
        </Link>
      )}

      {/* Who you are */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Account menu"
          className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-heading font-bold transition-colors ${
            menuOpen ? 'bg-white/15 border-white/25 text-white' : 'bg-white/[0.06] border-white/10 text-brand-200 hover:text-white hover:border-white/25'
          }`}
        >
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 bg-brand-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-sm font-heading text-white truncate">{user?.name ?? 'User'}</p>
              <p className="text-brand-400 text-xs font-heading truncate mt-0.5">{agency?.name ?? '—'}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-brand-200 text-[11px] font-heading tracking-wide">
                {planFor(agency?.plan).name}
              </span>
            </div>
            <div className="py-1">
              <MenuLink to="/dashboard/billing" onClick={() => setMenuOpen(false)}>Billing</MenuLink>
              <MenuLink to="/dashboard/settings" onClick={() => setMenuOpen(false)}>Settings</MenuLink>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm font-heading text-brand-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                View website
              </a>
            </div>
            <div className="border-t border-white/5 py-1">
              <button
                role="menuitem"
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm font-heading text-brand-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

function MenuLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="block px-4 py-2 text-sm font-heading text-brand-300 hover:text-white hover:bg-white/5 transition-colors"
    >
      {children}
    </Link>
  )
}
