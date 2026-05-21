'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface MReq {
  id: string
  problem_description: string
  status: string
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
  customer: { full_name: string; father_name: string; grandfather_name: string; phone: string; address: string } | null
  employee: { full_name: string } | null
}

export default function AdminMaintenancePage() {
  const [reqs, setReqs] = useState<MReq[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MReq | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*, customer:customers(full_name, father_name, grandfather_name, phone, address), employee:profiles!maintenance_requests_employee_id_fkey(full_name)')
      .order('created_at', { ascending: false })

    const mapped = (data || []).map((d: unknown) => {
      const item = d as { id: string; problem_description: string; status: string; admin_notes: string | null; created_at: string; resolved_at: string | null; customer: MReq['customer'] | MReq['customer'][]; employee: { full_name: string } | { full_name: string }[] | null }
      return {
        ...item,
        customer: Array.isArray(item.customer) ? item.customer[0] : item.customer,
        employee: Array.isArray(item.employee) ? item.employee[0] : item.employee,
      } as MReq
    })
    setReqs(mapped)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleUpdate(newStatus: string) {
    if (!selected) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('maintenance_requests').update({
      status: newStatus,
      admin_notes: notes,
      resolved_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', selected.id)
    setSelected(null)
    setSaving(false)
    load()
  }

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'معلق', color: '#d97706', bg: '#fffbeb' },
    in_progress: { label: 'قيد المعالجة', color: '#7c3aed', bg: '#f5f3ff' },
    completed: { label: 'مكتمل', color: '#16a34a', bg: '#f0fdf4' },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>طلبات الصيانة 🔧</h1>

      {loading ? (
        <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
      ) : reqs.length === 0 ? (
        <div className="card text-center py-16"><p className="text-gray-400 text-lg">لا توجد طلبات صيانة</p></div>
      ) : (
        <div className="space-y-3">
          {reqs.map(req => {
            const s = statusMap[req.status] || statusMap.pending
            return (
              <div key={req.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-gray-800">
                      {req.customer ? `${req.customer.full_name} ${req.customer.father_name}` : '-'}
                    </span>
                    <span className="badge" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1 line-clamp-1">🔧 {req.problem_description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>📞 {req.customer?.phone}</span>
                    <span>👤 {req.employee?.full_name}</span>
                    <span>📅 {formatDate(req.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => { setSelected(req); setNotes(req.admin_notes || '') }} className="btn-secondary text-sm px-4 py-2 mr-4 w-auto">
                  تفاصيل ←
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* نافذة التفاصيل */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl m-4">
            <div className="border-b p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: '#1a3a5c' }}>تفاصيل طلب الصيانة</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-4 rounded-xl">
                <div><span className="text-gray-500">الاسم: </span><span className="font-semibold">{selected.customer?.full_name} {selected.customer?.father_name} {selected.customer?.grandfather_name}</span></div>
                <div><span className="text-gray-500">الهاتف: </span><span className="font-semibold">{selected.customer?.phone}</span></div>
                <div><span className="text-gray-500">العنوان: </span><span className="font-semibold">{selected.customer?.address}</span></div>
                <div><span className="text-gray-500">التاريخ: </span><span className="font-semibold">{formatDate(selected.created_at)}</span></div>
              </div>
              <div>
                <p className="label">وصف المشكلة</p>
                <p className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{selected.problem_description}</p>
              </div>
              <div>
                <label className="label">ملاحظات الإداري</label>
                <textarea className="input-field" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="أضف ملاحظاتك..." />
              </div>
            </div>
            <div className="border-t p-5 flex gap-3">
              <button onClick={() => handleUpdate('in_progress')} disabled={saving} className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all" style={{ background: '#7c3aed15', color: '#7c3aed' }}>
                قيد المعالجة
              </button>
              <button onClick={() => handleUpdate('completed')} disabled={saving} className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all" style={{ background: '#16a34a15', color: '#16a34a' }}>
                ✅ مكتمل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
