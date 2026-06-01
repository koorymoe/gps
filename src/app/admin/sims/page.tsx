'use client'

import { useEffect, useState } from 'react'
import { getAllSimCards, addSimCard, releaseSimCard, updateSimCard } from '@/lib/firebase/firestore'

interface SimCard {
  id: string
  sim_number: string
  iccid?: string
  operator: string
  status: 'available' | 'in_use'
  current_customer_name: string | null
  current_request_id: string | null
  notes?: string
}

const OPERATORS = ['زين', 'آسياسيل', 'كورك', 'أخرى']

const emptyForm = { sim_number: '', iccid: '', operator: 'زين', notes: '' }

export default function SimsPage() {
  const [sims, setSims] = useState<SimCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editSim, setEditSim] = useState<SimCard | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    const data = await getAllSimCards()
    setSims(data as SimCard[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addSimCard({ sim_number: form.sim_number, iccid: form.iccid || undefined, operator: form.operator, notes: form.notes || undefined })
      setSuccess('تم إضافة SIM بنجاح')
      setShowAdd(false)
      setForm(emptyForm)
      load()
    } catch {
      setError('حدث خطأ أثناء الإضافة')
    }
    setSaving(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editSim) return
    setSaving(true)
    setError('')
    try {
      await updateSimCard(editSim.id, { sim_number: form.sim_number, iccid: form.iccid || undefined, operator: form.operator, notes: form.notes || undefined })
      setSuccess('تم التحديث بنجاح')
      setEditSim(null)
      setForm(emptyForm)
      load()
    } catch {
      setError('حدث خطأ أثناء التحديث')
    }
    setSaving(false)
  }

  async function handleRelease(sim: SimCard) {
    if (!confirm(`تحرير الخط ${sim.sim_number}؟`)) return
    await releaseSimCard(sim.id)
    setSuccess('تم تحرير الخط بنجاح')
    load()
  }

  function openEdit(sim: SimCard) {
    setEditSim(sim)
    setForm({ sim_number: sim.sim_number, iccid: sim.iccid || '', operator: sim.operator, notes: sim.notes || '' })
    setError('')
  }

  const total = sims.length
  const available = sims.filter(s => s.status === 'available').length
  const inUse = sims.filter(s => s.status === 'in_use').length

  const isModalOpen = showAdd || !!editSim

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>إدارة SIM كارتات 📱</h1>
        <button onClick={() => { setShowAdd(true); setEditSim(null); setForm(emptyForm); setError('') }}
          className="btn-secondary w-auto px-5 py-2.5 text-sm">
          + إضافة SIM جديد
        </button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
          <div className="text-3xl font-bold text-gray-800">{total}</div>
          <div className="text-sm text-gray-500 mt-1">إجمالي SIM</div>
        </div>
        <div className="bg-green-50 rounded-2xl shadow-sm p-5 text-center">
          <div className="text-3xl font-bold text-green-700">{available}</div>
          <div className="text-sm text-green-600 mt-1">متاح</div>
        </div>
        <div className="bg-blue-50 rounded-2xl shadow-sm p-5 text-center">
          <div className="text-3xl font-bold text-blue-700">{inUse}</div>
          <div className="text-sm text-blue-600 mt-1">مستخدم</div>
        </div>
      </div>

      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm text-center mb-4">{success}</div>}

      {/* Modal إضافة / تعديل */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
            <div className="border-b p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: '#1a3a5c' }}>{editSim ? 'تعديل SIM' : 'إضافة SIM جديد'}</h2>
              <button onClick={() => { setShowAdd(false); setEditSim(null) }} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <form onSubmit={editSim ? handleEdit : handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">رقم الخط *</label>
                <input className="input-field" value={form.sim_number} onChange={e => setForm(p => ({ ...p, sim_number: e.target.value }))} required placeholder="07xxxxxxxxx" />
              </div>
              <div>
                <label className="label">رقم الشريحة (ICCID)</label>
                <input className="input-field" value={form.iccid} onChange={e => setForm(p => ({ ...p, iccid: e.target.value }))} placeholder="اختياري" />
              </div>
              <div>
                <label className="label">المشغل *</label>
                <select className="input-field" value={form.operator} onChange={e => setForm(p => ({ ...p, operator: e.target.value }))} required>
                  {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <input className="input-field" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">{error}</div>}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'جارٍ الحفظ...' : editSim ? '✅ حفظ التعديل' : '✅ إضافة SIM'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* الجدول */}
      {loading ? (
        <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-5 py-3 font-semibold">رقم الخط</th>
                <th className="px-5 py-3 font-semibold">رقم الشريحة (ICCID)</th>
                <th className="px-5 py-3 font-semibold">المشغل</th>
                <th className="px-5 py-3 font-semibold">الحالة</th>
                <th className="px-5 py-3 font-semibold">الزبون الحالي</th>
                <th className="px-5 py-3 font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sims.map(sim => (
                <tr key={sim.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-800">{sim.sim_number}</td>
                  <td className="px-5 py-4 text-gray-500">{sim.iccid || '-'}</td>
                  <td className="px-5 py-4 text-gray-700">{sim.operator}</td>
                  <td className="px-5 py-4">
                    {sim.status === 'available'
                      ? <span className="badge bg-green-50 text-green-700">متاح</span>
                      : <span className="badge bg-blue-50 text-blue-700">مستخدم</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-500">{sim.current_customer_name || '-'}</td>
                  <td className="px-5 py-4">
                    {sim.status === 'in_use' ? (
                      <button onClick={() => handleRelease(sim)} className="text-orange-500 hover:text-orange-700 text-sm font-medium transition-colors">
                        تحرير الخط
                      </button>
                    ) : (
                      <button onClick={() => openEdit(sim)} className="text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors">
                        تعديل
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sims.length === 0 && <div className="text-center text-gray-400 py-12">لا توجد SIM كارتات</div>}
        </div>
      )}
    </div>
  )
}
