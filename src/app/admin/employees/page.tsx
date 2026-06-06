'use client'

import { useEffect, useState } from 'react'

interface Employee {
  id: string
  full_name: string
  email: string
  role: string
  created_at: { _seconds: number } | string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ full_name: '', username: '', password: '', role: 'employee' })

  async function loadEmployees() {
    const res = await fetch('/api/employees')
    const data = await res.json()
    setEmployees(data.employees || [])
    setLoading(false)
  }

  useEffect(() => { loadEmployees() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: `${form.username.trim()}@alamani.iq` }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error.includes('email-already-exists') ? 'البريد الإلكتروني مستخدم مسبقاً' : data.error)
    } else {
      setSuccess('تم إضافة الموظف بنجاح!')
      setForm({ full_name: '', username: '', password: '', role: 'employee' })
      setShowForm(false)
      loadEmployees()
    }
    setSaving(false)
  }

  async function handleDelete(uid: string, name: string) {
    if (!confirm(`هل تريد حذف ${name}؟`)) return
    await fetch('/api/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    })
    loadEmployees()
  }

  const roleLabel = (r: string) => r === 'admin' ? 'إداري' : 'موظف'
  const roleColor = (r: string) => r === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>إدارة الموظفين 👥</h1>
        <button onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
          className="btn-secondary w-auto px-5 py-2.5 text-sm">
          + إضافة موظف
        </button>
      </div>

      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm text-center mb-4">{success}</div>}

      {/* نموذج إضافة موظف */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
            <div className="border-b p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: '#1a3a5c' }}>إضافة موظف جديد</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">الاسم الكامل *</label>
                <input className="input-field" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required placeholder="محمد أحمد" />
              </div>
              <div>
                <label className="label">اسم المستخدم *</label>
                <div className="flex gap-2 items-center">
                  <input type="text" className="input-field flex-1" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required placeholder="ali_hassan" />
                  <span className="text-gray-400 text-sm whitespace-nowrap">@alamani.iq</span>
                </div>
              </div>
              <div>
                <label className="label">كلمة المرور *</label>
                <input type="password" className="input-field" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required placeholder="6 أحرف على الأقل" minLength={6} />
              </div>
              <div>
                <label className="label">الصلاحية *</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[['employee', 'موظف عادي', '👷'], ['admin', 'موظف إداري', '👔']].map(([val, label, icon]) => (
                    <button key={val} type="button" onClick={() => setForm(p => ({ ...p, role: val }))}
                      className="p-3 rounded-xl border-2 text-center transition-all"
                      style={{ borderColor: form.role === val ? '#1a3a5c' : '#e2e8f0', background: form.role === val ? '#1a3a5c' : 'white', color: form.role === val ? 'white' : '#1a202c' }}>
                      <div className="text-xl mb-1">{icon}</div>
                      <div className="text-sm font-semibold">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">{error}</div>}
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'جارٍ الإضافة...' : '✅ إضافة الموظف'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* جدول الموظفين */}
      {loading ? (
        <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-5 py-3 font-semibold">الاسم</th>
                <th className="px-5 py-3 font-semibold">اسم المستخدم</th>
                <th className="px-5 py-3 font-semibold">الصلاحية</th>
                <th className="px-5 py-3 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-800">{emp.full_name}</td>
                  <td className="px-5 py-4 text-gray-500">{emp.email?.replace('@alamani.iq', '') || '-'}</td>
                  <td className="px-5 py-4">
                    <span className={`badge ${roleColor(emp.role)}`}>{roleLabel(emp.role)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleDelete(emp.id, emp.full_name)}
                      className="text-red-400 hover:text-red-600 text-sm font-medium transition-colors">
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && <div className="text-center text-gray-400 py-12">لا يوجد موظفون</div>}
        </div>
      )}
    </div>
  )
}
