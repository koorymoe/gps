'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getSubscriptionLabel, getRemainingDays, getStatusLabel, getSubscriptionStatus } from '@/lib/utils'
import { SubscriptionType } from '@/types'

interface FoundCustomer {
  requestId: string
  customerId: string
  full_name: string
  father_name: string
  grandfather_name: string
  phone: string
  address: string
  subscription_end: string
  subscription_type: string
}

export default function RenewalsPage() {
  const [search, setSearch] = useState('')
  const [found, setFound] = useState<FoundCustomer | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [newSub, setNewSub] = useState<SubscriptionType>('3_months')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!search.trim()) return
    setLoading(true)
    setNotFound(false)
    setFound(null)
    setError('')

    const supabase = createClient()
    const { data } = await supabase
      .from('device_requests')
      .select('id, subscription_end, subscription_type, customer:customers(id, full_name, father_name, grandfather_name, phone, address)')
      .eq('status', 'delivered')
      .not('subscription_end', 'is', null)

    let match: FoundCustomer | null = null
    for (const d of (data || [])) {
      const item = d as { id: string; subscription_end: string; subscription_type: string; customer: { id: string; full_name: string; father_name: string; grandfather_name: string; phone: string; address: string } | { id: string; full_name: string; father_name: string; grandfather_name: string; phone: string; address: string }[] }
      const c = Array.isArray(item.customer) ? item.customer[0] : item.customer
      if (!c) continue
      const fullName = `${c.full_name} ${c.father_name} ${c.grandfather_name}`.toLowerCase()
      if (fullName.includes(search.toLowerCase()) || c.phone.includes(search)) {
        match = {
          requestId: item.id,
          customerId: c.id,
          full_name: c.full_name,
          father_name: c.father_name,
          grandfather_name: c.grandfather_name,
          phone: c.phone,
          address: c.address,
          subscription_end: item.subscription_end,
          subscription_type: item.subscription_type,
        }
        break
      }
    }

    if (match) setFound(match)
    else setNotFound(true)
    setLoading(false)
  }

  async function handleRenew() {
    if (!found) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const days = newSub === '3_months' ? 90 : newSub === '6_months' ? 180 : 365
    const now = new Date()
    const currentEnd = new Date(found.subscription_end)
    const startFrom = currentEnd > now ? currentEnd : now
    const newEnd = new Date(startFrom)
    newEnd.setDate(newEnd.getDate() + days)

    const { error: err } = await supabase
      .from('device_requests')
      .update({ subscription_type: newSub, subscription_end: newEnd.toISOString(), subscription_status: 'active' })
      .eq('id', found.requestId)

    if (err) { setError('حدث خطأ أثناء التجديد'); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center card">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3a5c' }}>تم التجديد بنجاح!</h2>
        <p className="text-gray-500 mb-6">تم تجديد اشتراك الزبون</p>
        <button onClick={() => { setSuccess(false); setFound(null); setSearch('') }} className="btn-primary">تجديد آخر</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>تجديد اشتراك 🔄</h1>

      {/* البحث */}
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

      {/* نتيجة البحث */}
      {found && (
        <div className="card space-y-5">
          <h3 className="font-semibold" style={{ color: '#1a3a5c' }}>بيانات الزبون</h3>
          <div className="grid grid-cols-2 gap-3 text-sm p-4 rounded-xl bg-gray-50">
            <div><span className="text-gray-500">الاسم: </span><span className="font-semibold">{found.full_name} {found.father_name} {found.grandfather_name}</span></div>
            <div><span className="text-gray-500">الهاتف: </span><span className="font-semibold">{found.phone}</span></div>
            <div><span className="text-gray-500">العنوان: </span><span className="font-semibold">{found.address}</span></div>
            <div><span className="text-gray-500">الاشتراك الحالي: </span><span className="font-semibold">{getSubscriptionLabel(found.subscription_type as SubscriptionType)}</span></div>
            <div><span className="text-gray-500">تاريخ الانتهاء: </span><span className="font-semibold">{formatDate(found.subscription_end)}</span></div>
            <div>
              <span className="text-gray-500">الحالة: </span>
              <span className="font-semibold" style={{ color: getRemainingDays(found.subscription_end) < 0 ? '#dc2626' : '#16a34a' }}>
                {getStatusLabel(getSubscriptionStatus(found.subscription_end))}
              </span>
            </div>
          </div>

          <div>
            <label className="label">نوع الاشتراك الجديد</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {([['3_months', '3 أشهر'], ['6_months', '6 أشهر'], ['yearly', 'سنوي']] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setNewSub(val)}
                  className="p-3 rounded-xl border-2 text-center text-sm font-semibold transition-all"
                  style={{
                    borderColor: newSub === val ? '#1a3a5c' : '#e2e8f0',
                    background: newSub === val ? '#1a3a5c' : 'white',
                    color: newSub === val ? 'white' : '#1a202c',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={handleRenew} className="btn-primary" disabled={loading}>
            {loading ? 'جارٍ التجديد...' : '✅ تجديد الاشتراك'}
          </button>
        </div>
      )}
    </div>
  )
}
