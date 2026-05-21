'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSubscriptionStatus, getStatusLabel, getStatusColor, getRemainingDays, formatDate } from '@/lib/utils'

interface SubData {
  id: string
  subscription_end: string
  subscription_type: string
  customer: { full_name: string; father_name: string; phone: string } | null
}

interface Stats {
  active: number
  expiring: number
  exp40: number
  exp80: number
  pending: number
  monthTotal: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ active: 0, expiring: 0, exp40: 0, exp80: 0, pending: 0, monthTotal: 0 })
  const [subs, setSubs] = useState<SubData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [{ data: requests }, { data: delivered }] = await Promise.all([
        supabase.from('device_requests').select('id, status').eq('status', 'pending'),
        supabase.from('device_requests').select('id, subscription_end, subscription_type, customer:customers(full_name, father_name, phone)').eq('status', 'delivered').not('subscription_end', 'is', null),
      ])

      const pending = requests?.length || 0
      let active = 0, expiring = 0, exp40 = 0, exp80 = 0

      const subsData: SubData[] = []

      delivered?.forEach((d: unknown) => {
        const item = d as { id: string; subscription_end: string; subscription_type: string; customer: { full_name: string; father_name: string; phone: string } | { full_name: string; father_name: string; phone: string }[] | null }
        if (!item.subscription_end) return
        const st = getSubscriptionStatus(item.subscription_end)
        if (st === 'active') active++
        else if (st === 'expiring_soon') expiring++
        else if (st === 'expired_40') exp40++
        else if (st === 'expired_80') exp80++

        const customerData = Array.isArray(item.customer) ? item.customer[0] : item.customer
        subsData.push({ id: item.id, subscription_end: item.subscription_end, subscription_type: item.subscription_type, customer: customerData || null })
      })

      // هذا الشهر
      const now = new Date()
      const { data: monthData } = await supabase
        .from('device_requests')
        .select('id')
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())

      setStats({ active, expiring, exp40, exp80, pending, monthTotal: monthData?.length || 0 })
      setSubs(subsData.sort((a, b) => getRemainingDays(a.subscription_end) - getRemainingDays(b.subscription_end)))
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'اشتراكات نشطة', value: stats.active, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    { label: 'قاربت على الانتهاء', value: stats.expiring, color: '#d97706', bg: '#fffbeb', icon: '⚠️' },
    { label: 'منتهية +40 يوم', value: stats.exp40, color: '#ea580c', bg: '#fff7ed', icon: '🔔' },
    { label: 'منتهية +80 يوم', value: stats.exp80, color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
    { label: 'طلبات معلقة', value: stats.pending, color: '#7c3aed', bg: '#f5f3ff', icon: '📋' },
    { label: 'طلبات هذا الشهر', value: stats.monthTotal, color: '#1a3a5c', bg: '#eff6ff', icon: '📊' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>لوحة المراقبة 📊</h1>
        <p className="text-gray-500 mt-1">متابعة شاملة لجميع الاشتراكات والطلبات</p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="stat-card" style={{ borderRightColor: card.color }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-3xl font-bold" style={{ color: card.color }}>
                {loading ? '...' : card.value}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {/* جدول الاشتراكات */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold" style={{ color: '#1a3a5c' }}>متابعة الاشتراكات</h2>
          <button onClick={() => router.push('/admin/subscriptions')} className="text-sm font-medium" style={{ color: '#1a3a5c' }}>عرض الكل ←</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>
        ) : subs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">لا توجد اشتراكات نشطة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-right text-sm text-gray-500 border-b">
                  <th className="px-5 py-3 font-semibold">الزبون</th>
                  <th className="px-5 py-3 font-semibold">الهاتف</th>
                  <th className="px-5 py-3 font-semibold">تاريخ الانتهاء</th>
                  <th className="px-5 py-3 font-semibold">الأيام المتبقية</th>
                  <th className="px-5 py-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {subs.slice(0, 10).map(sub => {
                  const status = getSubscriptionStatus(sub.subscription_end)
                  const days = getRemainingDays(sub.subscription_end)
                  return (
                    <tr key={sub.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-800">
                        {sub.customer ? `${sub.customer.full_name} ${sub.customer.father_name}` : '-'}
                      </td>
                      <td className="px-5 py-4 text-gray-500">{sub.customer?.phone || '-'}</td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(sub.subscription_end)}</td>
                      <td className="px-5 py-4">
                        <span className="font-bold" style={{ color: days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a' }}>
                          {days < 0 ? `${Math.abs(days)} يوم مضى` : `${days} يوم`}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ${getStatusColor(status)}`}>{getStatusLabel(status)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
