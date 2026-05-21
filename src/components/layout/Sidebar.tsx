'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  role: 'admin' | 'employee'
  userName: string
}

const adminLinks = [
  { href: '/admin', label: 'لوحة المراقبة', icon: '📊' },
  { href: '/admin/requests', label: 'الطلبات المعلقة', icon: '📋' },
  { href: '/admin/subscriptions', label: 'الاشتراكات', icon: '📡' },
  { href: '/admin/renewals', label: 'تجديد الاشتراك', icon: '🔄' },
  { href: '/admin/maintenance', label: 'الصيانة', icon: '🔧' },
  { href: '/admin/customers', label: 'الزبائن', icon: '👥' },
]

const employeeLinks = [
  { href: '/employee', label: 'الرئيسية', icon: '🏠' },
  { href: '/employee/purchase', label: 'شراء جهاز', icon: '🛒' },
  { href: '/employee/maintenance', label: 'صيانة', icon: '🔧' },
]

export default function Sidebar({ role, userName }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const links = role === 'admin' ? adminLinks : employeeLinks

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="sidebar flex flex-col">
      {/* شعار الشركة */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="10" fill="#0f2540" />
              <circle cx="24" cy="24" r="5" fill="#c9a84c" />
              <line x1="24" y1="4" x2="24" y2="14" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
              <line x1="24" y1="34" x2="24" y2="44" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
              <line x1="4" y1="24" x2="14" y2="24" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
              <line x1="34" y1="24" x2="44" y2="24" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm">شركة الأماني</p>
            <p className="text-yellow-300 text-xs">نظام GPS</p>
          </div>
        </div>
      </div>

      {/* معلومات المستخدم */}
      <div className="p-4 mx-3 mt-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center text-blue-900 font-bold text-sm">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{userName}</p>
            <p className="text-blue-200 text-xs">{role === 'admin' ? 'مدير' : 'موظف'}</p>
          </div>
        </div>
      </div>

      {/* روابط التنقل */}
      <nav className="flex-1 p-3 mt-2 space-y-1">
        {links.map(link => {
          const isActive = pathname === link.href
          return (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: isActive ? 'rgba(201, 168, 76, 0.2)' : 'transparent',
                color: isActive ? '#e8c96a' : 'rgba(255,255,255,0.75)',
                borderRight: isActive ? '3px solid #c9a84c' : '3px solid transparent',
              }}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </button>
          )
        })}
      </nav>

      {/* زر تسجيل الخروج */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-red-300 hover:bg-red-500/10 hover:text-red-200"
        >
          <span className="text-lg">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  )
}
