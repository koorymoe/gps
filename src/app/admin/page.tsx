'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeliveredSubscriptions, getAllSimCards } from '@/lib/firebase/firestore'
import { getSubscriptionStatus, getStatusLabel, getStatusColor, getRemainingDays, formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'

// Types
interface SubData {
  id: string
  subscription_end: string
  subscription_type: string
  activation_date?: string | null
  created_at?: string | null
  gps_number?: string
  customer: { full_name: string; father_name: string; grandfather_name: string; phone: string; address: string } | null
}

interface SimCard {
  id: string; sim_number: string; operator: string
  status: 'available' | 'in_use'; current_customer_name: string | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'subscriptions' | 'assets'>('overview')
  const [subs, setSubs] = useState<SubData[]>([])
  const [sims, setSims] = useState<SimCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SubData | null>(null)
  const [subFilter, setSubFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const [delivered, samsData] = await Promise.all([
        getDeliveredSubscriptions(),
        getAllSimCards(),
      ])
      setSubs(delivered as SubData[])
      setSims(samsData as SimCard[])
      setLoading(false)
    }
    load()
  }, [])

  // Stats
  const active = subs.filter(s => getSubscriptionStatus(s.subscription_end) === 'active').length
  const expiring = subs.filter(s => getSubscriptionStatus(s.subscription_end) === 'expiring_soon').length
  const exp40 = subs.filter(s => getSubscriptionStatus(s.subscription_end) === 'expired_40').length
  const exp80 = subs.filter(s => getSubscriptionStatus(s.subscription_end) === 'expired_80').length
  const simsAvailable = sims.filter(s => s.status === 'available').length
  const simsInUse = sims.filter(s => s.status === 'in_use').length

  const sorted = [...subs].sort((a, b) => getRemainingDays(a.subscription_end) - getRemainingDays(b.subscription_end))
  const filtered = subFilter === 'all' ? sorted : sorted.filter(s => getSubscriptionStatus(s.subscription_end) === subFilter)
  const expiringSoon = sorted.filter(s => {
    const d = getRemainingDays(s.subscription_end)
    return d >= 0 && d <= 30
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>لوحة المراقبة</h1>
        <p className="text-gray-500 text-sm mt-1">نظرة شاملة على جميع العمليات</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          ['overview', '📊 نظرة عامة'],
          ['subscriptions', '📡 الاشتراكات'],
          ['assets', '🏢 أصول الشركة'],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as typeof tab)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
            style={{ background: tab === v ? '#1a3a5c' : 'white', color: tab === v ? 'white' : '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flexShrink: 0 }}>
            {l}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'اشتراكات نشطة', value: active, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
              { label: 'تنتهي قريباً', value: expiring, color: '#d97706', bg: '#fffbeb', icon: '⚠️' },
              { label: 'منتهية +40 يوم', value: exp40, color: '#ea580c', bg: '#fff7ed', icon: '🔔' },
              { label: 'منتهية +80 يوم', value: exp80, color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
            ].map(card => (
              <div key={card.label} className="rounded-2xl p-5 shadow-sm" style={{ background: card.bg, border: `1px solid ${card.color}22` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{card.icon}</span>
                  <span className="text-3xl font-bold" style={{ color: card.color }}>{loading ? '...' : card.value}</span>
                </div>
                <p className="text-sm font-semibold" style={{ color: card.color }}>{card.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'الطلبات المعلقة', href: '/admin/requests', icon: '📋', color: '#7c3aed' },
              { label: 'تجديد اشتراك', href: '/admin/renewals', icon: '🔄', color: '#2d6a4f' },
              { label: 'إضافة زبون قديم', href: '/admin/legacy', icon: '📂', color: '#1a3a5c' },
              { label: 'إعدادات الأسعار', href: '/admin/settings', icon: '⚙️', color: '#64748b' },
            ].map(a => (
              <button key={a.href} onClick={() => router.push(a.href)}
                className="bg-white rounded-2xl p-4 text-right shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-sm font-semibold" style={{ color: a.color }}>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Expiring Soon Alert */}
          {expiringSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3">⚠️ تنتهي خلال 30 يوم ({expiringSoon.length} زبون)</h3>
              <div className="space-y-2">
                {expiringSoon.slice(0, 5).map(s => {
                  const days = getRemainingDays(s.subscription_end)
                  return (
                    <div key={s.id} onClick={() => { setSelected(s); setTab('subscriptions') }}
                      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 cursor-pointer hover:shadow-sm transition-all">
                      <div>
                        <span className="font-semibold text-gray-800 text-sm">
                          {s.customer ? `${s.customer.full_name} ${s.customer.father_name}` : '-'}
                        </span>
                        <span className="text-gray-400 text-xs mr-2">{s.customer?.phone}</span>
                      </div>
                      <span className="font-bold text-sm" style={{ color: days <= 7 ? '#dc2626' : '#d97706' }}>
                        {days} يوم
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SIM Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <div className="text-3xl font-bold text-gray-800">{sims.length}</div>
              <div className="text-sm text-gray-500 mt-1">إجمالي SIM</div>
            </div>
            <div className="rounded-2xl p-5 shadow-sm text-center" style={{ background: '#f0fdf4' }}>
              <div className="text-3xl font-bold text-green-700">{simsAvailable}</div>
              <div className="text-sm text-green-600 mt-1">SIM متاح</div>
            </div>
            <div className="rounded-2xl p-5 shadow-sm text-center" style={{ background: '#eff6ff' }}>
              <div className="text-3xl font-bold text-blue-700">{simsInUse}</div>
              <div className="text-sm text-blue-600 mt-1">SIM مستخدم</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Subscriptions */}
      {tab === 'subscriptions' && (
        <div className="flex gap-6">
          {/* Main Table */}
          <div className={`${selected ? 'hidden lg:block lg:flex-1' : 'flex-1'}`}>
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[['all','الكل'],['active','نشط'],['expiring_soon','قارب الانتهاء'],['expired_40','منتهي 40'],['expired_80','منتهي 80']].map(([v,l]) => (
                <button key={v} onClick={() => setSubFilter(v)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ background: subFilter === v ? '#1a3a5c' : 'white', color: subFilter === v ? 'white' : '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  {l}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
            ) : (
              <div className="space-y-2">
                {filtered.map(sub => {
                  const status = getSubscriptionStatus(sub.subscription_end)
                  const days = getRemainingDays(sub.subscription_end)
                  const isSelected = selected?.id === sub.id
                  return (
                    <div key={sub.id} onClick={() => setSelected(isSelected ? null : sub)}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm cursor-pointer transition-all hover:shadow-md"
                      style={{ borderRight: isSelected ? '3px solid #1a3a5c' : '3px solid transparent' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-800 text-sm truncate">
                              {sub.customer ? `${sub.customer.full_name} ${sub.customer.father_name} ${sub.customer.grandfather_name}` : '-'}
                            </span>
                            <span className={`badge text-xs ${getStatusColor(status)}`}>{getStatusLabel(status)}</span>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-400">
                            <span>📞 {sub.customer?.phone || '-'}</span>
                            {sub.gps_number && <span>📦 {sub.gps_number}</span>}
                          </div>
                        </div>
                        <div className="text-left mr-3 flex-shrink-0">
                          <div className="font-bold text-base" style={{ color: days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a' }}>
                            {days < 0 ? `${Math.abs(days)}-` : days}
                          </div>
                          <div className="text-xs text-gray-400">يوم</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(0, Math.min(100, (days / (sub.subscription_type === 'yearly' ? 365 : sub.subscription_type === '6_months' ? 180 : 90)) * 100))}%`,
                            background: days < 0 ? '#dc2626' : days < 30 ? '#d97706' : '#16a34a'
                          }} />
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && <div className="text-center text-gray-400 py-12">لا توجد اشتراكات</div>}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold" style={{ color: '#1a3a5c' }}>تفاصيل الزبون</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Customer Name */}
                <div className="text-center mb-4 pb-4 border-b">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2" style={{ background: '#1a3a5c' }}>
                    {selected.customer?.full_name?.charAt(0) || '?'}
                  </div>
                  <h4 className="font-bold text-gray-800">
                    {selected.customer ? `${selected.customer.full_name} ${selected.customer.father_name} ${selected.customer.grandfather_name}` : '-'}
                  </h4>
                </div>

                {/* Details */}
                <div className="space-y-3 text-sm">
                  {[
                    ['📞 الهاتف', selected.customer?.phone || '-'],
                    ['📍 العنوان', selected.customer?.address || '-'],
                    ['📦 رقم الجهاز', selected.gps_number || '-'],
                    ['📋 نوع الاشتراك', getSubscriptionLabel(selected.subscription_type as SubscriptionType)],
                    ['📅 تاريخ التفعيل', selected.activation_date ? formatDate(selected.activation_date) : '-'],
                    ['⏰ تاريخ الانتهاء', formatDate(selected.subscription_end)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <span className="text-gray-500 flex-shrink-0">{label}</span>
                      <span className="font-semibold text-gray-800 text-left">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Days remaining */}
                <div className="mt-4 p-3 rounded-xl text-center" style={{ background: getRemainingDays(selected.subscription_end) < 0 ? '#fef2f2' : getRemainingDays(selected.subscription_end) < 30 ? '#fffbeb' : '#f0fdf4' }}>
                  <div className="text-2xl font-bold" style={{ color: getRemainingDays(selected.subscription_end) < 0 ? '#dc2626' : getRemainingDays(selected.subscription_end) < 30 ? '#d97706' : '#16a34a' }}>
                    {Math.abs(getRemainingDays(selected.subscription_end))} يوم
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getRemainingDays(selected.subscription_end) < 0 ? 'منذ انتهاء الاشتراك' : 'متبقي على الانتهاء'}
                  </div>
                </div>

                <button onClick={() => router.push('/admin/renewals')} className="btn-primary mt-4 text-sm" style={{ padding: '0.65rem 1rem' }}>
                  🔄 تجديد الاشتراك
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Company Assets */}
      {tab === 'assets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <div className="text-3xl font-bold text-gray-800">{sims.length}</div>
              <div className="text-sm text-gray-500 mt-1">إجمالي SIM كارتات</div>
            </div>
            <div className="rounded-2xl p-5 shadow-sm text-center" style={{ background: '#f0fdf4' }}>
              <div className="text-3xl font-bold text-green-700">{simsAvailable}</div>
              <div className="text-sm text-green-600 mt-1">متاح للتوزيع</div>
            </div>
            <div className="rounded-2xl p-5 shadow-sm text-center" style={{ background: '#eff6ff' }}>
              <div className="text-3xl font-bold text-blue-700">{simsInUse}</div>
              <div className="text-sm text-blue-600 mt-1">مستخدم حالياً</div>
            </div>
          </div>

          {/* SIM List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold" style={{ color: '#1a3a5c' }}>SIM كارتات الشركة</h3>
              <button onClick={() => router.push('/admin/sims')} className="text-sm font-medium" style={{ color: '#1a3a5c' }}>إدارة SIM ←</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-right text-gray-500">
                    <th className="px-4 py-3 font-semibold">رقم الخط</th>
                    <th className="px-4 py-3 font-semibold">المشغل</th>
                    <th className="px-4 py-3 font-semibold">الحالة</th>
                    <th className="px-4 py-3 font-semibold">الزبون</th>
                  </tr>
                </thead>
                <tbody>
                  {sims.slice(0, 15).map((sim, i) => (
                    <tr key={sim.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }} className="border-t">
                      <td className="px-4 py-3 font-medium">{sim.sim_number}</td>
                      <td className="px-4 py-3 text-gray-600">{sim.operator}</td>
                      <td className="px-4 py-3">
                        {sim.status === 'available'
                          ? <span className="badge bg-green-50 text-green-700">متاح</span>
                          : <span className="badge bg-blue-50 text-blue-700">مستخدم</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{sim.current_customer_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sims.length === 0 && <div className="text-center text-gray-400 py-8">لا توجد SIM كارتات — <button onClick={() => router.push('/admin/sims')} className="text-blue-500 underline">أضف الآن</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
