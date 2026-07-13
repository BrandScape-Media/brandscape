import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { isSupabaseConfigured, getSupabase } from '../lib/supabase/client'
import type { User } from '../types'
import { Session } from '@supabase/supabase-js'

// Demo user for when Supabase isn't configured
const DEMO_USER: User = {
  id: 'demo-user-1',
  email: 'demo@agency.com',
  name: 'Demo User',
  avatar_url: undefined,
  agency_id: 'demo-agency-1',
  role: 'owner',
  created_at: new Date().toISOString(),
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  demoMode: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signInAsDemo: () => void
  signOut: () => Promise<void>
  /** Re-fetches the profile row (e.g. after agency onboarding sets agency_id). */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  const configured = isSupabaseConfigured()

  const handleUser = useCallback(async (session: Session | null) => {
    if (session?.user) {
      try {
        const { data: profile } = await getSupabase()
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: profile?.name ?? session.user.user_metadata?.full_name ?? 'User',
          avatar_url: session.user.user_metadata?.avatar_url,
          agency_id: profile?.agency_id,
          role: profile?.role ?? 'member',
          created_at: session.user.created_at,
        })
      } catch {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name ?? 'User',
          agency_id: undefined,
          role: 'member',
          created_at: session.user.created_at,
        })
      }
    } else {
      setUser(null)
    }
    setSession(session)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Auto-enable demo mode when Supabase isn't configured
    if (!configured) {
      setUser(DEMO_USER)
      setDemoMode(true)
      setLoading(false)
      return
    }

    getSupabase().auth.getSession().then(({ data: { session } }) => {
      handleUser(session)
    })

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      handleUser(session)
    })

    return () => subscription.unsubscribe()
  }, [handleUser, configured])

  const signInWithGoogle = async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInAsDemo = () => {
    setUser(DEMO_USER)
    setDemoMode(true)
    setSession(null)
  }

  const signOut = async () => {
    if (demoMode) {
      setUser(null)
      setDemoMode(false)
      return
    }
    const { error } = await getSupabase().auth.signOut()
    if (error) throw error
  }

  const refreshProfile = async () => {
    if (demoMode || !configured) return
    const { data: { session: current } } = await getSupabase().auth.getSession()
    await handleUser(current)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        demoMode,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsDemo,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
