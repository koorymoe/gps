'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
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

function parseSubType(val: string): string {
  const v = String(val || '').trim()
  if (v === '3_months' || v === '3' || v.includes('3')) return '3_months'
  if (v === '6_months' || v === '6' || v.includes('6')) return '6_months'
  return 'yearly'
}

function parseExcelDate(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const str = String(val).trim()
  // Try to parse various date formats
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return str
}

const emptyForm = {
  full_name: '', father_name: '', grandfather_name: '',
  phone: '', address: '', gps_number: '', sim_number: '',
  subscription_type: '3_months', activation_date: '', subscription_end: '', notes: '',
}

interface BulkRow {
  full_name: string; father_name: string; grandfather_name: string
  phone: string; address: string; gps_number: string; sim_number: string
  subscription_type: string; activation_date: string; subscription_end: string; notes: string
  _status?: 'pending' | 'success' | 'error'; _msg?: string
}

export default function LegacyPage() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
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
    setSaving(true); setError(''); setSuccess('')
    try {
      await addLegacyCustomer({ ...form, sim_number: form.sim_number || undefined, notes: form.notes || undefined })
      setSuccess(`تم إضافة الزبون ${form.full_name} ${form.father_name} بنجاح ✅`)
      setForm(emptyForm)
    } catch { setError('حدث خطأ أثناء الإضافة') }
    setSaving(false)
  }

  function downloadTemplate() {
    const headers = ['الاسم الأول','اسم الأب','اسم الجد','رقم الهاتف','العنوان','رقم الجهاز GPS','رقم الخط SIM','نوع الاشتراك (3_months/6_months/yearly)','تاريخ التفعيل (YYYY-MM-DD)','تاريخ الانتهاء (YYYY-MM-DD)','ملاحظات']
    const example = ['محمد','أحمد','علي','07701234567','بغداد - الكرخ','GPS-001','07901234567','yearly','2025-01-01','2026-01-01','']
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    ws['!cols'] = headers.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الزبائن')
    XLSX.writeFile(wb, 'template_زبائن_قدامى.xlsx')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<unknown>(ws, { header: 1 }) as unknown[][]
      if (rows.length < 2) { setError('الملف فارغ أو لا يحتوي على بيانات'); return }
      const parsed: BulkRow[] = []
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] as unknown[]
        if (!r || r.every(c => !c)) continue
        const actDate = parseExcelDate(r[8])
        const subType = parseSubType(String(r[7] || 'yearly'))
        const endDate = parseExcelDate(r[9]) || calcEnd(actDate, subType)
        parsed.push({
          full_name: String(r[0] || '').trim(),
          father_name: String(r[1] || '').trim(),
          grandfather_name: String(r[2] || '').trim(),
          phone: String(r[3] || '').trim(),
          address: String(r[4] || '').trim(),
          gps_number: String(r[5] || '').trim(),
          sim_number: String(r[6] || '').trim(),
          subscription_type: subType,
          activation_date: actDate,
          subscription_end: endDate,
          notes: String(r[10] || '').trim(),
          _status: 'pending',
        })
      }
      setBulkRows(parsed)
      setBulkDone(false)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function handleBulkUpload() {
    setBulkUploading(true)
    const updated = [...bulkRows]
    for (let i = 0; i < updated.length; i++) {
      if (updated[i]._status === 'success') continue
      try {
        await addLegacyCustomer({
          full_name: updated[i].full_name,
          father_name: updated[i].father_name,
          grandfather_name: updated[i].grandfather_name,
          phone: updated[i].phone,
          address: updated[i].address,
          gps_number: updated[i].gps_number,
          sim_number: updated[i].sim_number || undefined,
          subscription_type: updated[i].subscription_type,
          activation_date: updated[i].activation_date,
          subscription_end: updated[i].subscription_end,
          notes: updated[i].notes || undefined,
        })
        updated[i] = { ...updated[i], _status: 'success' }
      } catch {
        updated[i] = { ...updated[i], _status: 'error', _msg: 'فشل الإضافة' }
      }
      setBulkRows([...updated])
    }
    setBulkUploading(false)
    setBulkDone(true)
  }

  const successCount = bulkRows.filter(r => r._status === 'success').length
  const errorCount = bulkRows.filter(r => r._status === 'error').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>إضافة زبائن قدامى 📂</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <span className="text-blue-500 text-xl">ℹ️</span>
        <p className="text-blue-700 text-sm">هذه الصفحة لإضافة الزبائن المشتركين سابقاً قبل النظام — يدوياً أو عبر رفع ملف Excel</p>
      </div>

      {/* تبويبات */}
      <div className="flex gap-2 mb-6">
        {[['single','إضافة فردية ✏️'],['bulk','رفع Excel 📊']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v as 'single'|'bulk')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: tab === v ? '#1a3a5c' : 'white', color: tab === v ? 'white' : '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* إضافة فردية */}
      {tab === 'single' && (
        <div>
          {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm text-center mb-5">{success}</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm text-center mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold mb-4" style={{ color: '#1a3a5c' }}>معلومات الزبون</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {[['full_name','الاسم الأول','محمد'],['father_name','اسم الأب','أحمد'],['grandfather_name','اسم الجد','علي']].map(([k,l,p]) => (
                  <div key={k}><label className="label">{l} *</label><input className="input-field" value={form[k as keyof typeof form]} onChange={e => update(k, e.target.value)} required placeholder={p} /></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">رقم الهاتف *</label><input className="input-field" value={form.phone} onChange={e => update('phone', e.target.value)} required placeholder="07xxxxxxxxx" /></div>
                <div><label className="label">العنوان *</label><input className="input-field" value={form.address} onChange={e => update('address', e.target.value)} required placeholder="بغداد - الكرخ" /></div>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div>
              <h2 className="text-base font-bold mb-4" style={{ color: '#1a3a5c' }}>معلومات الجهاز</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">رقم الجهاز (GPS) *</label><input className="input-field" value={form.gps_number} onChange={e => update('gps_number', e.target.value)} required placeholder="GPS-0001" /></div>
                <div><label className="label">رقم الخط (SIM)</label><input className="input-field" value={form.sim_number} onChange={e => update('sim_number', e.target.value)} placeholder="07xxxxxxxxx - اختياري" /></div>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div>
              <h2 className="text-base font-bold mb-4" style={{ color: '#1a3a5c' }}>معلومات الاشتراك</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="label">نوع الاشتراك *</label>
                  <select className="input-field" value={form.subscription_type} onChange={e => update('subscription_type', e.target.value)} required>
                    {SUBSCRIPTION_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div><label className="label">تاريخ التفعيل *</label><input type="date" className="input-field" value={form.activation_date} onChange={e => update('activation_date', e.target.value)} required /></div>
                <div><label className="label">تاريخ الانتهاء *</label><input type="date" className="input-field" value={form.subscription_end} onChange={e => update('subscription_end', e.target.value)} required /></div>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div><label className="label">ملاحظات</label><textarea className="input-field resize-none" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="اختياري" rows={2} /></div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'جارٍ الإضافة...' : '✅ إضافة الزبون القديم'}</button>
          </form>
        </div>
      )}

      {/* رفع Excel */}
      {tab === 'bulk' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold mb-4" style={{ color: '#1a3a5c' }}>رفع ملف Excel</h2>
            <div className="flex gap-3 mb-4">
              <button onClick={downloadTemplate} className="btn-secondary" style={{ width: 'auto', flexShrink: 0, padding: '0.75rem 1.5rem' }}>
                ⬇️ تحميل Template
              </button>
              <button onClick={() => fileRef.current?.click()} className="btn-primary" style={{ width: 'auto', flexShrink: 0, padding: '0.75rem 1.5rem' }}>
                📂 اختيار ملف Excel
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
            </div>
            <p className="text-gray-400 text-xs">حمّل الـ Template أولاً، أملأه، ثم ارفعه — يدعم .xlsx و .xls</p>
          </div>

          {bulkRows.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <div>
                  <h3 className="font-bold" style={{ color: '#1a3a5c' }}>معاينة البيانات — {bulkRows.length} زبون</h3>
                  {bulkDone && <p className="text-sm mt-1" style={{ color: '#16a34a' }}>تم بنجاح: {successCount} | فشل: {errorCount}</p>}
                </div>
                {!bulkDone && (
                  <button onClick={handleBulkUpload} disabled={bulkUploading} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>
                    {bulkUploading ? `جارٍ الرفع... ${successCount}/${bulkRows.length}` : `✅ رفع ${bulkRows.length} زبون`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-right text-gray-500">
                      <th className="px-4 py-2 font-semibold">#</th>
                      <th className="px-4 py-2 font-semibold">الاسم</th>
                      <th className="px-4 py-2 font-semibold">الهاتف</th>
                      <th className="px-4 py-2 font-semibold">رقم الجهاز</th>
                      <th className="px-4 py-2 font-semibold">الاشتراك</th>
                      <th className="px-4 py-2 font-semibold">التفعيل</th>
                      <th className="px-4 py-2 font-semibold">الانتهاء</th>
                      <th className="px-4 py-2 font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, i) => (
                      <tr key={i} className="border-t" style={{ background: row._status === 'success' ? '#f0fdf4' : row._status === 'error' ? '#fef2f2' : 'white' }}>
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{row.full_name} {row.father_name}</td>
                        <td className="px-4 py-2 text-gray-600">{row.phone}</td>
                        <td className="px-4 py-2 text-gray-600">{row.gps_number}</td>
                        <td className="px-4 py-2 text-gray-600">{row.subscription_type}</td>
                        <td className="px-4 py-2 text-gray-600">{row.activation_date}</td>
                        <td className="px-4 py-2 text-gray-600">{row.subscription_end}</td>
                        <td className="px-4 py-2">
                          {row._status === 'success' && <span className="badge bg-green-50 text-green-700">✅ تم</span>}
                          {row._status === 'error' && <span className="badge bg-red-50 text-red-700">❌ فشل</span>}
                          {row._status === 'pending' && <span className="badge bg-gray-100 text-gray-500">انتظار</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
