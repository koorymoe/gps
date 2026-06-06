'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase/config'
import { searchCustomerSubscription, createRenewalRequest } from '@/lib/firebase/firestore'
import { getSubscriptionLabel, formatDate, getRemainingDays } from '@/lib/utils'
import { SubscriptionType } from '@/types'

type SearchResult = {
  requestId: string
  customerId: string
  full_name: unknown
  father_name: unknown
  grandfather_name: unknown
  phone: unknown
  address: unknown
  subscription_end: string | null
  subscription_type: unknown
}

export default function EmployeeRenewalPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [newSub, setNewSub] = useState<SubscriptionType>('3_months')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!search.trim()) return
    setLoading(true); setNotFound(false); setResults([]); setSelected(null); setError('')
    const result = await searchCustomerSubscription(search)
    if (result.length > 0) {
      setResults(result as SearchResult[])
      if (result.length === 1) setSelected(result[0] as SearchResult)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  async function handleSubmit() {
    if (!selected) return
    const user = auth.currentUser
    if (!user) { setError('غير مسجل'); return }
    setLoading(true); setError('')
    try {
      await createRenewalRequest({
        customer_id: selected.customerId,
        original_request_id: selected.requestId,
        employee_id: user.uid,
        subscription_type: newSub,
        current_end: selected.subscription_end as string,
      })
      setSuccess(true)
    } catch {
      setError('حدث خطأ أثناء إرسال الطلب')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center card">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3a5c' }}>تم إرسال طلب التجديد للإداري</h2>
        <p className="text-gray-500 mb-6">سيتم مراجعته والموافقة عليه من قبل الإداري</p>
        <div className="flex gap-3">
          <button onClick={() => router.push('/employee')} className="btn-primary">الرئيسية</button>
          <button onClick={() => { setSuccess(false); setSelected(null); setResults([]); setSearch('') }} className="btn-secondary">طلب آخر</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/employee')} className="text-gray-400 hover:text-gray-600">← رجوع</button>
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>طلب تجديد اشتراك 🔄</h1>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-4" style={{ color: '#1a3a5c' }}>البحث عن الزبون</h3>
        <div className="flex gap-3">
          <input
            className="input-field flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="اسم الزبون أو رقم الهاتف..."
            style={{ minWidth: 0 }}
          />
          <button onClick={handleSearch} className="btn-secondary" style={{ width: 'auto', flexShrink: 0, padding: '0.75rem 2rem' }} disabled={loading}>
            {loading ? '...' : 'بحث'}
          </button>
        </div>
        {notFound && <p className="text-red-500 text-sm mt-3">لم يتم العثور على الزبون</p>}
      </div>

      {/* قائمة النتائج */}
      {results.length > 1 && !selected && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-3" style={{ color: '#1a3a5c' }}>نتائج البحث ({results.length})</h3>
          <div className="space-y-2">
            {results.map(r => {
              const days = r.subscription_end ? getRemainingDays(r.subscription_end) : null
              return (
                <button
                  key={r.requestId}
                  onClick={() => setSelected(r)}
                  className="w-full text-right p-4 rounded-xl border-2 hover:border-blue-400 transition-all"
                  style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{r.full_name as string} {r.father_name as string} {r.grandfather_name as string}</div>
                      <div className="text-sm text-gray-500 mt-0.5">📞 {r.phone as string}</div>
                    </div>
                    {days !== null && (
                      <span className="font-bold text-sm" style={{ color: days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a' }}>
                        {days < 0 ? `منتهي ${Math.abs(days)} يوم` : `${days} يوم`}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* تفاصيل الزبون المختار */}
      {selected && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: '#1a3a5c' }}>بيانات الزبون</h3>
            {results.length > 1 && (
              <button onClick={() => setSelected(null)} className="text-sm text-blue-500 hover:text-blue-700">← تغيير الزبون</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm p-4 rounded-xl bg-gray-50">
            <div><span className="text-gray-500">الاسم: </span><span className="font-semibold">{selected.full_name as string} {selected.father_name as string} {selected.grandfather_name as string}</span></div>
            <div><span className="text-gray-500">الهاتف: </span><span className="font-semibold">{selected.phone as string}</span></div>
            <div><span className="text-gray-500">العنوان: </span><span className="font-semibold">{selected.address as string}</span></div>
            <div><span className="text-gray-500">الاشتراك الحالي: </span><span className="font-semibold">{getSubscriptionLabel(selected.subscription_type as SubscriptionType)}</span></div>
            <div><span className="text-gray-500">تاريخ الانتهاء: </span><span className="font-semibold">{selected.subscription_end ? formatDate(selected.subscription_end) : '-'}</span></div>
            <div>
              <span className="text-gray-500">الأيام المتبقية: </span>
              <span className="font-semibold" style={{ color: selected.subscription_end && getRemainingDays(selected.subscription_end) < 0 ? '#dc2626' : '#16a34a' }}>
                {selected.subscription_end ? getRemainingDays(selected.subscription_end) : '-'} يوم
              </span>
            </div>
          </div>
          <div>
            <label className="label">نوع الاشتراك الجديد</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {([['3_months','3 أشهر'],['6_months','6 أشهر'],['yearly','سنوي']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => setNewSub(val)}
                  className="p-3 rounded-xl border-2 text-center text-sm font-semibold transition-all"
                  style={{ borderColor: newSub === val ? '#1a3a5c' : '#e2e8f0', background: newSub === val ? '#1a3a5c' : 'white', color: newSub === val ? 'white' : '#1a202c' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            {loading ? 'جارٍ الإرسال...' : '📤 إرسال طلب التجديد للإداري'}
          </button>
        </div>
      )}
    </div>
  )
}
