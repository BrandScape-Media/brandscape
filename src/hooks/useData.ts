import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'
import { demoAgency, demoAssets, demoClients, demoProjects } from '../data/demo'
import type { Agency, Client, MediaAsset, Project } from '../types'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

function useAsyncData<T>(fetcher: () => Promise<T>, demoValue: T, deps: unknown[] = []): AsyncState<T> {
  const { demoMode } = useAuth()
  const [data, setData] = useState<T | null>(demoMode ? demoValue : null)
  const [loading, setLoading] = useState(!demoMode)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  // keep latest fetcher without retriggering the effect every render
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (demoMode) {
      setData(demoValue)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, version, ...deps])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data, loading, error, reload }
}

export function useClients(): AsyncState<Client[]> {
  return useAsyncData(api.listClients, demoClients)
}

export function useProjects(): AsyncState<Project[]> {
  return useAsyncData(api.listProjects, demoProjects)
}

export function useProject(projectId: string | undefined): AsyncState<Project | null> {
  return useAsyncData(
    () => (projectId ? api.getProject(projectId) : Promise.resolve(null)),
    demoProjects.find((p) => p.id === projectId) ?? demoProjects[0],
    [projectId],
  )
}

export function useAgency(): AsyncState<Agency | null> {
  const { user } = useAuth()
  return useAsyncData(
    () => (user?.agency_id ? api.getAgency(user.agency_id) : Promise.resolve(null)),
    demoAgency,
    [user?.agency_id],
  )
}

export function useAssets(): AsyncState<MediaAsset[]> {
  return useAsyncData(api.listAssets, demoAssets)
}
