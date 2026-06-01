'use client'

import { useState } from 'react'
import { addLegacyCustomer } from '@/lib/firebase/firestore'

const SUBSCRIPTION_TYPES = [
  { value: '3_months', label: '3 أشهر', days: 90 },
  { value: '6_months', label: '6 أشهر', days: 180 },
  { value: 'yearly', label: 'سنوي', days: 365 },
]

function calcEnd(activationDate: string, subType: string): string {
  if (!activationDate) return ''
  const found = SUBSCRIPTION_TYPES.find(s => s.value === subType)
  if (!found) return ''
  const d = new Date(activationDate)
  d.setDate(d.getDate() + found.days)
  return d.toISOString().slice(0, 10)
}

const emptyForm = {
  full_name: '',
  father_name: '',
  grandfather_name: '',
  phone: '',
  address: '',
  gps_number: '',
  sim_number: '',
  subscription_type: '3_months',
  activation_date: '',
  subscription_end: '',
  notes: '',
}

export default function LegacyPage() {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function update(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-calc end date when activation_date or subscription_type changes
      if (field === 'activation_date' || field === 'subscription_type') {
        const ad = field === 'activation_date' ? value : prev.activation_date
        const st = field === 'subscription_type' ? value : prev.subscription_type
        next.subscription_end = calcEnd(ad, st)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await addLegacyCustomer({
        full_name: form.full_name,
        father_name: form.father_name,
        grandfather_name: form.grandfather_name,
        phone: form.phone,
        address: form.address,
        gps_number: form.gps_number,
        sim_number: form.sim_number || undefined,
        subscription_type: form.subscription_type,
        activation_date: form.activation_date,
        subscription_end: form.subscription_end,
        notes: form.notes || undefined,
      })
      setSuccess(`تم إضافة الزبون ${form.full_name} ${form.father_name} بنجاح ✅`)
      setForm(emptyForm)
    } catch {
      setError('حدث خطأ أثناء الإضافة، يرجى المحاولة مرة أخرى')
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>إضافة زبون قديم 📂</h1>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="text-blue-500 text-xl mt-0.5">ℹ️</span>
        <p className="text-blue-700 text-sm">هذه الصفحة لإضافة الزبائن المشتركين سابقاً قبل النظام</p>
      </div>

      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm text-center mb-5">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm text-center mb-5">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-6">

        {/* معلومات الزبون */}
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: '#1a3a5c' }}>معلومات الزبون</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">الاسم الأول *</label>
              <input className="input-field" value={form.full_name} onChange={e => update('full_name', e.target.value)} required placeholder="محمد" />
            </div>
            <div>
              <label className="label">اسم الأب *</label>
              <input className="input-field" value={form.father_name} onChange={e => update('father_name', e.target.value)} required placeholder="أحمد" />
            </div>
            <div>
              <label className="label">اسم الجد *</label>
              <input className="input-field" value={form.grandfather_name} onChange={e => update('grandfather_name', e.target.value)} required placeholder="علي" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">رقم الهاتف *</label>
              <input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="07xxxxxxxxx" />
            </div>
            <div>
              <label className="label">العنوان *</label>
              <input className="input-field" value={form.address} onChange={e => update('address', e.target.value)} required placeholder="بغداد - الكرخ" />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* معلومات الجهاز */}
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: '#1a3a5c' }}>معلومات الجهاز</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">رقم الجهاز (GPS) *</label>
              <input className="input-field" value={form.gps_number} onChange={e => update('gps_number', e.target.value)} required placeholder="GPS-0001" />
            </div>
            <div>
              <label className="label">رقم الخط (SIM)</label>
              <input className="input-field" value={form.sim_number} onChange={e => update('sim_number', e.target.value)} placeholder="07xxxxxxxxx - اختياري" />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* معلومات الاشتراك */}
        <div>
          <h2 className="text-base font-bold mb-4" style={{ color: '#1a3a5c' }}>معلومات الاشتراك</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">نوع الاشتراك *</label>
              <select className="input-field" value={form.subscription_type} onChange={e => update('subscription_type', e.target.value)} required>
                {SUBSCRIPTION_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">تاريخ التفعيل *</label>
              <input type="date" className="input-field" value={form.activation_date} onChange={e => update('activation_date', e.target.value)} required />
            </div>
            <div>
              <label className="label">تاريخ الانتهاء *</label>
              <input type="date" className="input-field" value={form.subscription_end} onChange={e => update('subscription_end', e.target.value)} required />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ملاحظات */}
        <div>
          <label className="label">ملاحظات</label>
          <textarea className="input-field min-h-[80px] resize-none" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="اختياري" rows={3} />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'جارٍ الإضافة...' : '✅ إضافة الزبون القديم'}
        </button>
      </form>
    </div>
  )
}
