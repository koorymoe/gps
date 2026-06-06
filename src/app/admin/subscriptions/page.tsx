'use client'

import { useEffect, useState } from 'react'
import { getDeliveredSubscriptions, deleteDeviceRequest } from '@/lib/firebase/firestore'
import { getSubscriptionStatus, getStatusLabel, getStatusColor, getRemainingDays, formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'

interface Sub {
  id: string; subscription_end: string; subscription_type: string
  created_at?: string | null; activation_date?: string | null
  customer: { full_name: string; father_name: string; grandfather_name: string; phone: string; address: string } | null
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function load() {
    setLoading(true)
    const data = await getDeliveredSubscriptions()
    setSubs((data as Sub[]).sort((a, b) => getRemainingDays(a.subscription_end) - getRemainingDays(b.subscription_end)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? subs : subs.filter(s => getSubscriptionStatus(s.subscription_end) === filter)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(s => s.id)))
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => deleteDeviceRequest(id)))
      setSubs(prev => prev.filter(s => !selected.has(s.id)))
      setSelected(new Set())
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const selectedNames = [...selected].map(id => {
    const sub = subs.find(s => s.id === id)
    return sub?.customer ? `${sub.customer.full_name} ${sub.customer.father_name}` : id
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>الاشتراكات 📡</h1>
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {[['all','الكل'],['active','نشط'],['expiring_soon','قارب الانتهاء'],['expired_40','منتهي 40 يوم'],['expired_80','منتهي 80 يوم']].map(([v,l]) => (
          <button key={v} onClick={() => { setFilter(v); setSelected(new Set()) }}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{ background: filter === v ? '#1a3a5c' : 'white', color: filter === v ? 'white' : '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {l}
          </button>
        ))}
        {selected.size > 0 && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all mr-auto"
            style={{ background: '#dc2626', color: 'white' }}
          >
            🗑️ حذف المحدد ({selected.size})
          </button>
        )}
      </div>

      {/* نافذة تأكيد الحذف */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-3 text-red-600">⚠️ تأكيد الحذف</h3>
            <p className="text-gray-600 text-sm mb-3">سيتم حذف {selected.size} اشتراك:</p>
            <ul className="text-sm text-gray-700 mb-4 max-h-32 overflow-y-auto">
              {selectedNames.map((name, i) => <li key={i} className="py-0.5">• {name}</li>)}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl font-semibold text-white"
                style={{ background: '#dc2626' }}
              >
                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-xl font-semibold"
                style={{ background: '#f1f5f9', color: '#64748b' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div> : (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3">
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll} className="w-4 h-4 cursor-pointer" />
                </th>
                <th className="px-5 py-3 font-semibold">الزبون</th>
                <th className="px-5 py-3 font-semibold">الهاتف</th>
                <th className="px-5 py-3 font-semibold">نوع الاشتراك</th>
                <th className="px-5 py-3 font-semibold">تاريخ الشراء</th>
                <th className="px-5 py-3 font-semibold">تاريخ التفعيل</th>
                <th className="px-5 py-3 font-semibold">تاريخ الانتهاء</th>
                <th className="px-5 py-3 font-semibold">الأيام</th>
                <th className="px-5 py-3 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sub => {
                const status = getSubscriptionStatus(sub.subscription_end)
                const days = getRemainingDays(sub.subscription_end)
                const isSelected = selected.has(sub.id)
                return (
                  <tr key={sub.id} className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{ background: isSelected ? '#fef2f2' : undefined }}
                    onClick={() => toggleSelect(sub.id)}
                  >
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(sub.id)} className="w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-800">{sub.customer ? `${sub.customer.full_name} ${sub.customer.father_name} ${sub.customer.grandfather_name}` : '-'}</td>
                    <td className="px-5 py-4 text-gray-500">{sub.customer?.phone}</td>
                    <td className="px-5 py-4"><span className="badge bg-blue-50 text-blue-700">{getSubscriptionLabel(sub.subscription_type as SubscriptionType)}</span></td>
                    <td className="px-5 py-4 text-gray-500 text-sm">{sub.created_at ? formatDate(sub.created_at) : '-'}</td>
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: '#16a34a' }}>{sub.activation_date ? formatDate(sub.activation_date) : '-'}</td>
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: '#dc2626' }}>{formatDate(sub.subscription_end)}</td>
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
