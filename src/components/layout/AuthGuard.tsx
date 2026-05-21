'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthChange, getUserProfile } from '@/lib/firebase/auth'
import Sidebar from './Sidebar'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole: 'admin' | 'employee'
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) { router.push('/'); return }
      const profile = await getUserProfile(user.uid)
      if (!profile) { router.push('/'); return }
      if (requiredRole === 'admin' && profile.role !== 'admin') { router.push('/employee'); return }
      if (requiredRole === 'employee' && profile.role === 'admin') { router.push('/admin'); return }
      setUserName(profile.full_name || '')
      setReady(true)
    })
    return () => unsub()
  }, [router, requiredRole])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f4f8' }}>
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" style={{ color: '#1a3a5c' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-gray-400">جارٍ التحقق...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar role={requiredRole} userName={userName} />
      <main className="flex-1 p-8 min-h-screen" style={{ background: '#f0f4f8' }}>
        {children}
      </main>
    </div>
  )
}
