'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSubscriptionStatus, getStatusLabel, getStatusColor, getRemainingDays, formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'

interface Sub {
  id: string
  subscription_end: string
  subscription_type: string
  subscription_start: string
  customer: { full_name: string; father_name: string; grandfather_name: string; phone: string; address: string } | null
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('device_requests')
        .select('id, subscription_end, subscription_type, subscription_start, customer:customers(full_name, father_name, grandfather_name, phone, address)')
        .eq('status', 'delivered')
        .not('subscription_end', 'is', null)
        .order('subscription_end', { ascending: true })

      const mapped = (data || []).map((d: unknown) => {
        const item = d as { id: string; subscription_end: string; subscription_type: string; subscription_start: string; customer: Sub['customer'] | Sub['customer'][] }
        return {
          ...item,
          customer: Array.isArray(item.customer) ? item.customer[0] : item.customer,
        } as Sub
      })
      setSubs(mapped)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? subs : subs.filter(s => getSubscriptionStatus(s.subscription_end) === filter)

  const filters = [
    { value: 'all', label: 'الكل' },
    { value: 'active', label: 'نشط' },
    { value: 'expiring_soon', label: 'قارب الانتهاء' },
    { value: 'expired_40', label: 'منتهي 40 يوم' },
    { value: 'expired_80', label: 'منتهي 80 يوم' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>الاشتراكات 📡</h1>

      {/* فلاتر */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: filter === f.value ? '#1a3a5c' : 'white',
              color: filter === f.value ? 'white' : '#64748b',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-5 py-3 font-semibold">الزبون</th>
                <th className="px-5 py-3 font-semibold">الهاتف</th>
                <th className="px-5 py-3 font-semibold">العنوان</th>
                <th className="px-5 py-3 font-semibold">نوع الاشتراك</th>
                <th className="px-5 py-3 font-semibold">تاريخ الانتهاء</th>
                <th className="px-5 py-3 font-semibold">الأيام</th>
                <th className="px-5 py-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const status = getSubscriptionStatus(sub.subscription_end)
                const days = getRemainingDays(sub.subscription_end)
                return (
                  <tr key={sub.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-800">
                      {sub.customer ? `${sub.customer.full_name} ${sub.customer.father_name} ${sub.customer.grandfather_name}` : '-'}
                    </td>
                    <td className="px-5 py-4 text-gray-500">{sub.customer?.phone}</td>
                    <td className="px-5 py-4 text-gray-500 text-sm">{sub.customer?.address}</td>
                    <td className="px-5 py-4">
                      <span className="badge bg-blue-50 text-blue-700">{getSubscriptionLabel(sub.subscription_type as SubscriptionType)}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(sub.subscription_end)}</td>
                    <td className="px-5 py-4 font-bold" style={{ color: days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a' }}>
                      {days < 0 ? `${Math.abs(days)}-` : days}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${getStatusColor(status)}`}>{getStatusLabel(status)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-12">لا توجد اشتراكات في هذه الفئة</div>
          )}
        </div>
      )}
    </div>
  )
}
