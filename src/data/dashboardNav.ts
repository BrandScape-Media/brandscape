/**
 * The dashboard's navigation, in one place.
 *
 * Three consumers read this — the sidebar renders it, the top bar resolves
 * breadcrumb labels from it, and the command palette offers it as jump
 * targets. Keeping it here means adding a page is one edit, not three.
 */

export type NavGroupId = 'work' | 'account' | 'staff'

export interface NavItem {
  to: string
  label: string
  icon: string
  /** which count to show in the sidebar, if any */
  badge?: 'projects' | 'clients'
}

export interface NavGroup {
  id: NavGroupId
  /** null for the first group — a label above the top item is just noise */
  label: string | null
  items: NavItem[]
  /** Brandscape staff only */
  staffOnly?: boolean
}

export const navGroups: NavGroup[] = [
  {
    id: 'work',
    label: null,
    items: [
      { to: '/dashboard', label: 'Overview', icon: 'grid' },
      { to: '/dashboard/projects', label: 'Projects', icon: 'folder', badge: 'projects' },
      { to: '/dashboard/clients', label: 'Clients', icon: 'users', badge: 'clients' },
      { to: '/dashboard/library', label: 'Media Library', icon: 'library' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { to: '/dashboard/billing', label: 'Billing', icon: 'billing' },
      { to: '/dashboard/settings', label: 'Settings', icon: 'settings' },
    ],
  },
  {
    id: 'staff',
    label: 'Brandscape',
    staffOnly: true,
    items: [{ to: '/dashboard/admin', label: 'Admin', icon: 'shield' }],
  },
]

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items)

/**
 * Is this nav item the one the current route belongs to?
 *
 * `/dashboard` needs an exact match — every other route starts with it, so a
 * prefix test would light up Overview everywhere.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.to === '/dashboard') return pathname === '/dashboard'
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** The nav item a route sits under, for the default breadcrumb. */
export function navItemForPath(pathname: string): NavItem | undefined {
  return navItems.find((item) => isNavItemActive(item, pathname))
}
