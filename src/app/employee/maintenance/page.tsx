'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase/config'
import { createCustomer, createMaintenanceRequest } from '@/lib/firebase/firestore'

export default function MaintenancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', father_name: '', grandfather_name: '', phone: '', address: '', problem_type: 'delay_activation', problem_description: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = auth.currentUser
      if (!user) throw new Error('غير مسجل')

      const customerId = await createCustomer({
        full_name: form.full_name, father_name: form.father_name,
        grandfather_name: form.grandfather_name, phone: form.phone, address: form.address,
        id_card_front_url: '', id_card_back_url: '',
        residence_card_front_url: '', residence_card_back_url: '',
      })

      await createMaintenanceRequest({ customer_id: customerId, employee_id: user.uid, problem_type: form.problem_type, problem_description: form.problem_description })
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center card">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3a5c' }}>تم إرسال طلب الصيانة!</h2>
        <p className="text-gray-500 mb-6">سيتم مراجعته من قبل الموظف الإداري</p>
        <div className="flex gap-3">
          <button onClick={() => router.push('/employee')} className="btn-primary">الرئيسية</button>
          <button onClick={() => { setSuccess(false); setForm({ full_name: '', father_name: '', grandfather_name: '', phone: '', address: '', problem_type: 'delay_activation', problem_description: '' }) }} className="btn-secondary">طلب جديد</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/employee')} className="text-gray-400 hover:text-gray-600">← رجوع</button>
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>طلب صيانة 🔧</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h3 className="text-lg font-bold mb-5" style={{ color: '#1a3a5c' }}>معلومات الزبون</h3>
          <div className="grid grid-cols-3 gap-4">
            {[['full_name','الاسم الأول','محمد'],['father_name','اسم الأب','أحمد'],['grandfather_name','اسم الجد','علي']].map(([k,l,p]) => (
              <div key={k}>
                <label className="label">{l} *</label>
                <input className="input-field" value={form[k as keyof typeof form]} onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))} required placeholder={p} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">رقم الهاتف *</label>
              <input className="input-field" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required placeholder="07XXXXXXXXX" />
            </div>
            <div>
              <label className="label">العنوان *</label>
              <input className="input-field" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} required placeholder="المحافظة / المنطقة" />
            </div>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-bold mb-5" style={{ color: '#1a3a5c' }}>وصف المشكلة</h3>
          <div className="mb-4">
            <label className="label">نوع المشكلة *</label>
            <select className="input-field" value={form.problem_type} onChange={e => setForm(p => ({ ...p, problem_type: e.target.value }))} required>
              <option value="delay_activation">تأخير في التفعيل</option>
              <option value="device_malfunction">عطل في الجهاز</option>
              <option value="device_broken">كسر في الجهاز</option>
              <option value="signal_loss">انقطاع الإشارة</option>
              <option value="device_lost">ضياع الجهاز</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div>
            <label className="label">تفاصيل إضافية (اختياري)</label>
            <textarea className="input-field" rows={4} value={form.problem_description} onChange={e => setForm(p => ({ ...p, problem_description: e.target.value }))} placeholder="أي تفاصيل إضافية..." />
          </div>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'جارٍ الإرسال...' : 'إرسال طلب الصيانة ←'}</button>
      </form>
    </div>
  )
}
