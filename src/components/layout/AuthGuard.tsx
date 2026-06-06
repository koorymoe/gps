'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { logoutUser } from '@/lib/firebase/auth'
import { useAuth } from '@/lib/AuthContext'
import Sidebar from './Sidebar'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole: 'admin' | 'employee'
}

interface MobileNavProps {
  role: 'admin' | 'employee'
  userName: string
}

const adminNavItems = [
  { href: '/admin', label: 'لوحة المراقبة', icon: '📊' },
  { href: '/admin/requests', label: 'الطلبات', icon: '📋' },
  { href: '/admin/subscriptions', label: 'الاشتراكات', icon: '📡' },
  { href: '/admin/renewals', label: 'التجديد', icon: '🔄' },
]

const adminMoreItems = [
  { href: '/admin/maintenance', label: 'الصيانة', icon: '🔧' },
  { href: '/admin/customers', label: 'الزبائن', icon: '👥' },
  { href: '/admin/employees', label: 'الموظفين', icon: '🧑‍💼' },
  { href: '/admin/sims', label: 'SIM كارتات', icon: '📱' },
  { href: '/admin/legacy', label: 'زبائن قدامى', icon: '📂' },
  { href: '/admin/settings', label: 'الإعدادات', icon: '⚙️' },
]

const employeeNavItems = [
  { href: '/employee', label: 'الرئيسية', icon: '🏠' },
  { href: '/employee/purchase', label: 'شراء جهاز', icon: '🛒' },
  { href: '/employee/delivery', label: 'تسليم جهاز', icon: '📦' },
  { href: '/employee/renewal', label: 'تجديد', icon: '🔄' },
  { href: '/employee/maintenance', label: 'صيانة', icon: '🔧' },
]

function MobileNav({ role, userName }: MobileNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const navItems = role === 'employee' ? employeeNavItems : adminNavItems

  async function handleLogout() {
    await logoutUser()
    router.push('/')
  }

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          background: 'white',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.10)',
          borderTop: '1px solid #e8edf4',
        }}
      >
        <div className="flex items-stretch">
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex-1 flex flex-col items-center justify-center py-2 px-1 transition-all"
                style={{ color: isActive ? '#1a3a5c' : '#94a3b8' }}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="text-xs font-semibold leading-tight">{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: '#1a3a5c' }} />
                )}
              </button>
            )
          })}
          {role === 'admin' && (
            <button
              onClick={() => setSheetOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-2 px-1 transition-all"
              style={{ color: '#94a3b8' }}
            >
              <span className="text-xl mb-0.5">⋯</span>
              <span className="text-xs font-semibold leading-tight">المزيد</span>
            </button>
          )}
        </div>
      </nav>

      {/* Slide-up sheet for admin "more" items */}
      {role === 'admin' && sheetOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setSheetOpen(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden rounded-t-2xl"
            style={{ background: 'white', boxShadow: '0 -4px 32px rgba(0,0,0,0.15)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="font-bold text-gray-800">القائمة</span>
              <button onClick={() => setSheetOpen(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {adminMoreItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); setSheetOpen(false) }}
                    className="flex flex-col items-center justify-center py-4 rounded-xl transition-all"
                    style={{
                      background: isActive ? '#1a3a5c' : '#f8fafc',
                      color: isActive ? 'white' : '#1a3a5c',
                    }}
                  >
                    <span className="text-2xl mb-1">{item.icon}</span>
                    <span className="text-xs font-semibold text-center leading-tight">{item.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="px-4 pb-6">
              <div className="flex items-center gap-3 mb-3 p-3 rounded-xl" style={{ background: '#f8fafc' }}>
                <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-blue-900 font-bold text-sm flex-shrink-0">
                  {userName.charAt(0)}
                </div>
                <span className="font-semibold text-gray-800 text-sm">{userName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-red-500"
                style={{ background: '#fef2f2' }}
              >
                <span>🚪</span>
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter()
  const { user, ready } = useAuth()
  const userName = user?.full_name || ''

  useEffect(() => {
    if (!ready) return
    if (!user) { router.push('/'); return }
    if (requiredRole === 'admin' && user.role !== 'admin') { router.push('/employee'); return }
    if (requiredRole === 'employee' && user.role === 'admin') { router.push('/admin'); return }
  }, [ready, user, router, requiredRole])

  if (!ready || !user) {
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
    <div className="flex flex-col lg:flex-row min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar role={requiredRole} userName={userName} />
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom navigation - hidden on desktop */}
      <MobileNav role={requiredRole} userName={userName} />
    </div>
  )
}
