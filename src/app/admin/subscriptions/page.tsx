'use client'

import { useEffect, useState } from 'react'
import { getDeliveredSubscriptions } from '@/lib/firebase/firestore'
import { getSubscriptionStatus, getStatusLabel, getStatusColor, getRemainingDays, formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'

interface Sub { id: string; subscription_end: string; subscription_type: string; customer: { full_name: string; father_name: string; grandfather_name: string; phone: string; address: string } | null }

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const data = await getDeliveredSubscriptions()
      setSubs((data as Sub[]).sort((a, b) => getRemainingDays(a.subscription_end) - getRemainingDays(b.subscription_end)))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? subs : subs.filter(s => getSubscriptionStatus(s.subscription_end) === filter)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>الاشتراكات 📡</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {[['all','الكل'],['active','نشط'],['expiring_soon','قارب الانتهاء'],['expired_40','منتهي 40 يوم'],['expired_80','منتهي 80 يوم']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ background: filter === v ? '#1a3a5c' : 'white', color: filter === v ? 'white' : '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {l}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div> : (
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
                    <td className="px-5 py-4 font-medium text-gray-800">{sub.customer ? `${sub.customer.full_name} ${sub.customer.father_name} ${sub.customer.grandfather_name}` : '-'}</td>
                    <td className="px-5 py-4 text-gray-500">{sub.customer?.phone}</td>
                    <td className="px-5 py-4 text-gray-500 text-sm">{sub.customer?.address}</td>
                    <td className="px-5 py-4"><span className="badge bg-blue-50 text-blue-700">{getSubscriptionLabel(sub.subscription_type as SubscriptionType)}</span></td>
                    <td className="px-5 py-4 text-gray-500">{formatDate(sub.subscription_end)}</td>
                    <td className="px-5 py-4 font-bold" style={{ color: days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a' }}>{days < 0 ? `${Math.abs(days)}-` : days}</td>
                    <td className="px-5 py-4"><span className={`badge ${getStatusColor(status)}`}>{getStatusLabel(status)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-12">لا توجد اشتراكات في هذه الفئة</div>}
        </div>
      )}
    </div>
  )
}
