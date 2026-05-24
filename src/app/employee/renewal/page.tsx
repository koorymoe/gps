'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase/config'
import { searchCustomerSubscription, createRenewalRequest } from '@/lib/firebase/firestore'
import { getSubscriptionLabel, formatDate, getRemainingDays } from '@/lib/utils'
import { SubscriptionType } from '@/types'

export default function EmployeeRenewalPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [found, setFound] = useState<Record<string, unknown> | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [newSub, setNewSub] = useState<SubscriptionType>('3_months')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!search.trim()) return
    setLoading(true); setNotFound(false); setFound(null); setError('')
    const result = await searchCustomerSubscription(search)
    if (result) setFound(result as Record<string, unknown>)
    else setNotFound(true)
    setLoading(false)
  }

  async function handleSubmit() {
    if (!found) return
    const user = auth.currentUser
    if (!user) { setError('غير مسجل'); return }
    setLoading(true); setError('')
    try {
      await createRenewalRequest({
        customer_id: found.customerId as string,
        original_request_id: found.requestId as string,
        employee_id: user.uid,
        subscription_type: newSub,
        current_end: found.subscription_end as string,
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
          <button onClick={() => { setSuccess(false); setFound(null); setSearch('') }} className="btn-secondary">طلب آخر</button>
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

      <div className="card mb-6">
        <h3 className="font-semibold mb-4" style={{ color: '#1a3a5c' }}>البحث عن الزبون</h3>
        <div className="flex gap-3">
          <input
            className="input-field flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="اسم الزبون أو رقم الهاتف..."
          />
          <button onClick={handleSearch} className="btn-secondary px-6 py-2 w-auto" disabled={loading}>
            {loading ? '...' : 'بحث'}
          </button>
        </div>
        {notFound && <p className="text-red-500 text-sm mt-3">لم يتم العثور على الزبون</p>}
      </div>

      {found && (
        <div className="card space-y-5">
          <h3 className="font-semibold" style={{ color: '#1a3a5c' }}>بيانات الزبون</h3>
          <div className="grid grid-cols-2 gap-3 text-sm p-4 rounded-xl bg-gray-50">
            <div><span className="text-gray-500">الاسم: </span><span className="font-semibold">{found.full_name as string} {found.father_name as string} {found.grandfather_name as string}</span></div>
            <div><span className="text-gray-500">الهاتف: </span><span className="font-semibold">{found.phone as string}</span></div>
            <div><span className="text-gray-500">العنوان: </span><span className="font-semibold">{found.address as string}</span></div>
            <div><span className="text-gray-500">الاشتراك الحالي: </span><span className="font-semibold">{getSubscriptionLabel(found.subscription_type as SubscriptionType)}</span></div>
            <div><span className="text-gray-500">تاريخ الانتهاء: </span><span className="font-semibold">{formatDate(found.subscription_end as string)}</span></div>
            <div>
              <span className="text-gray-500">الأيام المتبقية: </span>
              <span className="font-semibold" style={{ color: getRemainingDays(found.subscription_end as string) < 0 ? '#dc2626' : '#16a34a' }}>
                {getRemainingDays(found.subscription_end as string)} يوم
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
