import { useEffect, useRef, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BreadcrumbProvider } from '../context/BreadcrumbContext'
import { useAgency, useClients, useProjects } from '../hooks/useData'
import { navGroups, isNavItemActive, type NavItem } from '../data/dashboardNav'
import { planFor } from '../data/plans'
import AgencyOnboarding from '../components/AgencyOnboarding'
import TopBar from '../components/dashboard/TopBar'
import CommandPalette from '../components/dashboard/CommandPalette'

const COLLAPSE_KEY = 'bs.sidebar.collapsed'

/**
 * Soft white glow bleeding in from the left and bottom of the workspace,
 * drifting a little toward the cursor. Sits above the black base but below
 * the content, so it shows through the translucent cards.
 */
function AmbientGlow() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const px = e.clientX / window.innerWidth - 0.5 // -0.5 … 0.5
        const py = e.clientY / window.innerHeight - 0.5
        el.style.setProperty('--gx', `${px * 46}px`)
        el.style.setProperty('--gy', `${py * 46}px`)
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])
  return <div ref={ref} className="dash-ambient pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden />
}

export default function DashboardLayout() {
  // Mobile only: the sidebar is an off-canvas drawer (on desktop it's always
  // visible in flow). Default closed so it never covers content on load.
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, demoMode } = useAuth()
  const location = useLocation()

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // ⌘K / Ctrl+K from anywhere in the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Real accounts must belong to an agency before using the dashboard
  if (!demoMode && user && !user.agency_id) {
    return <AgencyOnboarding />
  }

  const groups = navGroups.filter((g) => !g.staffOnly || user?.platform_admin)

  return (
    <BreadcrumbProvider>
      <div className="relative min-h-screen bg-brand-black flex">
        {/* Mobile drawer backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          className={`fixed inset-0 z-30 bg-black/60 lg:hidden transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden
        />

        {/* Sidebar — off-canvas drawer on mobile, in-flow on desktop. Stays
            mounted either way so it slides rather than pops. */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 shrink-0 bg-brand-950 border-r border-white/5 transition-[transform,width] duration-200 ease-out ${
            collapsed ? 'w-[72px]' : 'w-64'
          } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={`h-16 flex items-center border-b border-white/5 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
              <img src="/logo-dark.png" alt="Brandscape" className={collapsed ? 'h-7 w-7 object-cover object-left' : 'h-7'} />
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              {groups.map((group, gi) => (
                <div key={group.id} className={gi > 0 ? 'mt-5' : ''}>
                  {group.label && !collapsed && (
                    <p className="px-3 pb-1.5 text-[11px] font-heading tracking-wider uppercase text-brand-500">
                      {group.label}
                    </p>
                  )}
                  {group.label && collapsed && <div className="mx-3 mb-2 border-t border-white/5" />}
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.to}
                        item={item}
                        active={isNavItemActive(item, location.pathname)}
                        collapsed={collapsed}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <SidebarFooter collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
          </div>
        </aside>

        {/* Main */}
        <div className="relative z-10 flex-1 flex flex-col min-w-0">
          <AmbientGlow />
          <TopBar onToggleMobile={() => setMobileOpen((o) => !o)} onOpenSearch={() => setSearchOpen(true)} />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>

        <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </BreadcrumbProvider>
  )
}

/**
 * One nav row.
 *
 * The active state is a violet rail plus a lift in fill, so it can't be
 * confused with hover — which used to be literally half the active fill, and
 * read as a smudge rather than "you are here".
 */
function SidebarLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const { data: projects } = useProjects()
  const { data: clients } = useClients()

  let count: number | null = null
  if (item.badge === 'projects' && projects) count = projects.filter((p) => !p.archived).length
  if (item.badge === 'clients' && clients) count = clients.length

  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 py-2.5 rounded-r-lg border-l-2 text-sm font-heading transition-colors ${
        collapsed ? 'justify-center px-2' : 'px-3'
      } ${
        active
          ? 'border-violet-400 bg-white/[0.06] text-white'
          : 'border-transparent text-brand-400 hover:text-brand-100 hover:bg-white/[0.03]'
      }`}
    >
      <SidebarIcon name={item.icon} />
      {!collapsed && (
        <>
          <span className="tracking-wide flex-1 truncate">{item.label}</span>
          {/* omitted while loading — a flash of 0 reads as "you have nothing" */}
          {count !== null && <span className="text-[11px] font-heading text-brand-400 tabular-nums">{count}</span>}
        </>
      )}
    </Link>
  )
}

/** Which agency you're in and on what plan, plus the collapse control. */
function SidebarFooter({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { data: agency } = useAgency()
  const plan = planFor(agency?.plan)

  return (
    <div className="border-t border-white/5 p-3">
      {!collapsed && (
        <div className="px-2 pb-3">
          <p className="text-sm font-heading text-brand-100 truncate">{agency?.name ?? '—'}</p>
          <p className="text-[11px] font-heading text-brand-400 tracking-wide mt-0.5">{plan.name}</p>
        </div>
      )}
      <button
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`w-full flex items-center gap-2 py-2 rounded-lg text-brand-400 hover:text-white hover:bg-white/[0.03] transition-colors ${
          collapsed ? 'justify-center px-2' : 'px-3'
        }`}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        {!collapsed && <span className="text-[11px] font-heading tracking-wider uppercase">Collapse</span>}
      </button>
    </div>
  )
}

function SidebarIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    folder: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    library: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    billing: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    shield: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  }
  return icons[name] ?? null
}
