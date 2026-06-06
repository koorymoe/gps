'use client'

import { useEffect, useState } from 'react'
import { getAllCustomers, deleteCustomer } from '@/lib/firebase/firestore'
import { formatDate } from '@/lib/utils'

interface Customer { id: string; full_name: string; father_name: string; grandfather_name: string; phone: string; address: string; created_at: { seconds: number } | string }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const data = await getAllCustomers()
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
    return name.includes(search.toLowerCase()) || c.phone.includes(search)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>الزبائن 👥</h1>
        <span className="text-sm text-gray-400">{customers.length} زبون</span>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <input className="input-field max-w-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم الهاتف..." />
        {selected.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="btn-primary"
            style={{ width: 'auto', padding: '0.6rem 1.5rem', background: '#dc2626' }}
          >
            {deleting ? 'جارٍ الحذف...' : `🗑️ حذف المحددين (${selected.size})`}
          </button>
        )}
      </div>

      {loading ? <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div> : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="w-4 h-4 cursor-pointer" />
                </th>
                <th className="px-5 py-3 font-semibold">الاسم الكامل</th>
                <th className="px-5 py-3 font-semibold">رقم الهاتف</th>
                <th className="px-5 py-3 font-semibold">العنوان</th>
                <th className="px-5 py-3 font-semibold">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors" style={{ background: selected.has(c.id) ? '#fef2f2' : '' }}>
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 cursor-pointer" />
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-800">{c.full_name} {c.father_name} {c.grandfather_name}</td>
                  <td className="px-5 py-4 text-gray-500">{c.phone}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm">{c.address}</td>
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
