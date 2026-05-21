'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface Customer {
  id: string
  full_name: string
  father_name: string
  grandfather_name: string
  phone: string
  address: string
  created_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
      setCustomers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter(c => {
    const name = `${c.full_name} ${c.father_name} ${c.grandfather_name}`.toLowerCase()
    return name.includes(search.toLowerCase()) || c.phone.includes(search)
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>الزبائن 👥</h1>

      <div className="mb-4">
        <input
          className="input-field max-w-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو رقم الهاتف..."
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-5 py-3 font-semibold">الاسم الكامل</th>
                <th className="px-5 py-3 font-semibold">رقم الهاتف</th>
                <th className="px-5 py-3 font-semibold">العنوان</th>
                <th className="px-5 py-3 font-semibold">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-800">{c.full_name} {c.father_name} {c.grandfather_name}</td>
                  <td className="px-5 py-4 text-gray-500">{c.phone}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm">{c.address}</td>
                  <td className="px-5 py-4 text-gray-500 text-sm">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-12">لا توجد نتائج</div>
          )}
        </div>
      )}
    </div>
  )
}
