'use client'

import { useEffect, useState } from 'react'
import { getAllCustomersWithSubscriptions, deleteCustomer, updateSubscriptionEnd } from '@/lib/firebase/firestore'
import { formatDate, getRemainingDays } from '@/lib/utils'

interface Subscription { id: string; gps_number?: string; sim_number?: string; subscription_end?: string; status?: string }
interface Customer { id: string; full_name: string; father_name: string; grandfather_name: string; phone: string; address: string; created_at: { seconds: number } | string; subscription: Subscription | null }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const data = await getAllCustomersWithSubscriptions()
    setCustomers(data as Customer[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getDate(val: { seconds: number } | string) {
    if (typeof val === 'string') return formatDate(val)
    if (val?.seconds) return formatDate(new Date(val.seconds * 1000).toISOString())
    return '-'
  }

  const filtered = customers.filter(c => {
    const name = `${c.full_name} ${c.father_name} ${c.grandfather_name}`.toLowerCase()
    const gps = c.subscription?.gps_number || ''
    return name.includes(search.toLowerCase()) || c.phone.includes(search) || gps.includes(search)
  })

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
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    const names = customers.filter(c => selected.has(c.id)).map(c => `${c.full_name} ${c.father_name}`).join('، ')
    if (!confirm(`هل تريد حذف ${selected.size} زبون؟\n${names}`)) return
    setDeleting(true)
    await Promise.all([...selected].map(id => deleteCustomer(id)))
    setCustomers(prev => prev.filter(c => !selected.has(c.id)))
    setSelected(new Set())
    setDeleting(false)
  }

  function openEdit(c: Customer) {
    setEditCustomer(c)
    setEditDate(c.subscription?.subscription_end || '')
  }

  async function handleSaveDate() {
    if (!editCustomer?.subscription?.id || !editDate) return
    setSaving(true)
    await updateSubscriptionEnd(editCustomer.subscription.id, editDate)
    setCustomers(prev => prev.map(c =>
      c.id === editCustomer.id
        ? { ...c, subscription: c.subscription ? { ...c.subscription, subscription_end: editDate } : c.subscription }
        : c
    ))
    setEditCustomer(null)
    setEditDate('')
    setSaving(false)
  }

  function getStatusBadge(sub: Subscription | null) {
    if (!sub?.subscription_end) return <span className="text-gray-300 text-xs">-</span>
    const days = getRemainingDays(sub.subscription_end)
    if (days < 0) return <span className="badge bg-red-50 text-red-600">منتهي</span>
    if (days < 30) return <span className="badge bg-yellow-50 text-yellow-600">قارب الانتهاء</span>
    return <span className="badge bg-green-50 text-green-600">نشط</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>الزبائن 👥</h1>
        <span className="text-sm text-gray-400">{customers.length} زبون</span>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <input className="input-field max-w-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم الهاتف أو رقم GPS..." />
        {selected.size > 0 && (
          <button onClick={handleDeleteSelected} disabled={deleting} className="btn-primary"
            style={{ width: 'auto', padding: '0.6rem 1.5rem', background: '#dc2626' }}>
            {deleting ? 'جارٍ الحذف...' : `🗑️ حذف المحددين (${selected.size})`}
          </button>
        )}
      </div>

      {/* نافذة تعديل تاريخ الانتهاء */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-1" style={{ color: '#1a3a5c' }}>تعديل تاريخ الانتهاء</h3>
            <p className="text-sm text-gray-500 mb-4">{editCustomer.full_name} {editCustomer.father_name} {editCustomer.grandfather_name}</p>
            <div className="mb-4">
              <label className="label">تاريخ انتهاء الاشتراك</label>
              <input
                type="date"
                className="input-field"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
              />
              {editDate && (
                <div className="mt-2 text-sm font-semibold" style={{ color: getRemainingDays(editDate) < 0 ? '#dc2626' : '#16a34a' }}>
                  الأيام المتبقية: {(() => { const d = getRemainingDays(editDate); return d < 0 ? `${Math.abs(d)}-` : d })()}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveDate} disabled={saving || !editDate} className="flex-1 py-2 rounded-xl font-semibold text-white"
                style={{ background: '#1a3a5c' }}>
                {saving ? 'جارٍ الحفظ...' : '✅ حفظ'}
              </button>
              <button onClick={() => setEditCustomer(null)} className="flex-1 py-2 rounded-xl font-semibold"
                style={{ background: '#f1f5f9', color: '#64748b' }}>
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
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="w-4 h-4 cursor-pointer" />
                </th>
                <th className="px-5 py-3 font-semibold">الاسم الكامل</th>
                <th className="px-5 py-3 font-semibold">رقم الهاتف</th>
                <th className="px-5 py-3 font-semibold">رقم الشريحة</th>
                <th className="px-5 py-3 font-semibold">رقم الجهاز</th>
                <th className="px-5 py-3 font-semibold">تاريخ انتهاء الاشتراك</th>
                <th className="px-5 py-3 font-semibold">الأيام المتبقية</th>
                <th className="px-5 py-3 font-semibold">الحالة</th>
                <th className="px-5 py-3 font-semibold">تعديل</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors" style={{ background: selected.has(c.id) ? '#fef2f2' : '' }}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 cursor-pointer" />
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      <span>{c.full_name} {c.father_name} {c.grandfather_name}</span>
                      {c.subscription && (
                        <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-600 text-xs font-semibold transition-colors flex-shrink-0">✏️</button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{c.phone}</td>
                  <td className="px-5 py-4 font-bold" style={{ color: '#1a3a5c' }}>{c.subscription?.sim_number || '-'}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm">{c.subscription?.gps_number || '-'}</td>
                  <td className="px-5 py-4 text-sm font-medium" style={{ color: '#dc2626' }}>
                    {c.subscription?.subscription_end ? formatDate(c.subscription.subscription_end) : '-'}
                  </td>
                  <td className="px-5 py-4 font-bold text-sm">
                    {c.subscription?.subscription_end ? (() => {
                      const d = getRemainingDays(c.subscription.subscription_end)
                      return <span style={{ color: d < 0 ? '#dc2626' : d < 30 ? '#d97706' : '#16a34a' }}>{d < 0 ? `${Math.abs(d)}-` : d}</span>
                    })() : '-'}
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(c.subscription)}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm">{getDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center text-gray-400 py-12">لا توجد نتائج</div>}
        </div>
      )}
    </div>
  )
}
