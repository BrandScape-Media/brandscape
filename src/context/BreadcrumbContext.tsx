import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export interface Crumb {
  label: string
  /** omit on the last crumb — you're already there */
  to?: string
}

interface BreadcrumbValue {
  crumbs: Crumb[]
  setCrumbs: (crumbs: Crumb[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbValue>({ crumbs: [], setCrumbs: () => {} })

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs])
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
}

/** Read the trail — the top bar is the only consumer. */
export function useBreadcrumb(): Crumb[] {
  return useContext(BreadcrumbContext).crumbs
}

/**
 * Publish a breadcrumb trail from a detail page.
 *
 * The layout can name static routes on its own, but it has no idea what
 * project 8f3c… is called, and making it fetch one just for a label would
 * duplicate a query the page already ran. So the page tells it.
 *
 * Pass whatever you have — a page that's still loading can send `[]` and fill
 * it in on the next render. The trail is cleared on unmount, so navigating
 * away can never leave a stale name in the chrome.
 */
export function useSetBreadcrumb(crumbs: Crumb[]) {
  const { setCrumbs } = useContext(BreadcrumbContext)
  // Depend on the content, not the array identity — callers build the array
  // inline every render, and comparing identity would loop forever.
  const key = JSON.stringify(crumbs)
  const apply = useCallback(() => setCrumbs(JSON.parse(key) as Crumb[]), [key, setCrumbs])

  useEffect(() => {
    apply()
    return () => setCrumbs([])
  }, [apply, setCrumbs])
}
