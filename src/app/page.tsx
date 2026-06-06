'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, getUserProfile } from '@/lib/firebase/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await loginUser(email, password)
      const profile = await getUserProfile(user.uid)
      if (profile?.role === 'admin') router.push('/admin')
      else router.push('/employee')
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 50%, #0f2540 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-5 bg-white" />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full opacity-5 bg-white" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full opacity-5 bg-yellow-400" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 shadow-2xl" style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c96a)' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="10" fill="#0f2540" />
              <circle cx="24" cy="24" r="5" fill="#c9a84c" />
              <line x1="24" y1="4" x2="24" y2="14" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
              <line x1="24" y1="34" x2="24" y2="44" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
              <line x1="4" y1="24" x2="14" y2="24" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
              <line x1="34" y1="24" x2="44" y2="24" stroke="#0f2540" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">شركة الأماني</h1>
          <p className="text-yellow-300 text-sm font-medium tracking-wider">نظام إدارة خدمات GPS</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #c9a84c, #e8c96a, #c9a84c)' }} />
          <div className="p-8">
            <h2 className="text-xl font-bold text-center mb-6" style={{ color: '#1a3a5c' }}>تسجيل الدخول</h2>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="label">البريد الإلكتروني</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input type="email" className="input-field pr-10" placeholder="example@alamani.iq" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="label">كلمة المرور</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input type="password" className="input-field pr-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">{error}</div>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    جارٍ الدخول...
                  </span>
                ) : 'دخول'}
              </button>
            </form>
          </div>
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">© 2024 شركة الأماني لخدمات GPS - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    </div>
  )
}
