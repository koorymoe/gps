'use client'

import { useEffect, useState } from 'react'
import { getAllCustomers, deleteCustomer } from '@/lib/firebase/firestore'
import { formatDate } from '@/lib/utils'

interface Customer { id: string; full_name: string; father_name: string; grandfather_name: string; phone: string; address: string; created_at: { seconds: number } | string }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

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

  async function handleDelete(c: Customer) {
    if (!confirm(`هل تريد حذف الزبون ${c.full_name} ${c.father_name}؟`)) return
    setDeleting(c.id)
    await deleteCustomer(c.id)
    setCustomers(prev => prev.filter(x => x.id !== c.id))
    setDeleting(null)
  }

  const filtered = customers.filter(c => {
    const name = `${c.full_name} ${c.father_name} ${c.grandfather_name}`.toLowerCase()
    return name.includes(search.toLowerCase()) || c.phone.includes(search)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>الزبائن 👥</h1>
        <span className="text-sm text-gray-400">{customers.length} زبون</span>
      </div>
      <div className="mb-4">
        <input className="input-field max-w-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو رقم الهاتف..." />
      </div>
      {loading ? <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div> : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-5 py-3 font-semibold">الاسم الكامل</th>
                <th className="px-5 py-3 font-semibold">رقم الهاتف</th>
                <th className="px-5 py-3 font-semibold">العنوان</th>
                <th className="px-5 py-3 font-semibold">تاريخ التسجيل</th>
                <th className="px-5 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-800">{c.full_name} {c.father_name} {c.grandfather_name}</td>
                  <td className="px-5 py-4 text-gray-500">{c.phone}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm">{c.address}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm">{getDate(c.created_at)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deleting === c.id}
                      className="text-red-400 hover:text-red-600 text-sm font-medium transition-colors"
                    >
                      {deleting === c.id ? '...' : 'حذف'}
                    </button>
                  </td>
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
