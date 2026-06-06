'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange, getUserProfile } from '@/lib/firebase/auth'

interface AuthUser {
  uid: string
  full_name: string
  role: string
}

const AuthContext = createContext<{ user: AuthUser | null; ready: boolean }>({ user: null, ready: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setReady(true)
        return
      }
      const profile = await getUserProfile(firebaseUser.uid)
      if (profile) {
        setUser({ uid: firebaseUser.uid, full_name: profile.full_name || '', role: profile.role })
      } else {
        setUser(null)
      }
      setReady(true)
    })
    return () => unsub()
  }, [])

  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
