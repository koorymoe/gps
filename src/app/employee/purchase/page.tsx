'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SubscriptionType } from '@/types'

type PurchaseType = 'device_sim' | 'device_only'
type Step = 'select_type' | 'form'

export default function PurchasePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select_type')
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('device_sim')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    father_name: '',
    grandfather_name: '',
    phone: '',
    address: '',
    subscription_type: '3_months' as SubscriptionType,
  })

  const [files, setFiles] = useState({
    id_card_front: null as File | null,
    id_card_back: null as File | null,
    residence_card_front: null as File | null,
    residence_card_back: null as File | null,
  })

  const [previews, setPreviews] = useState({
    id_card_front: '',
    id_card_back: '',
    residence_card_front: '',
    residence_card_back: '',
  })

  function handleFileChange(field: keyof typeof files, file: File | null) {
    if (!file) return
    setFiles(prev => ({ ...prev, [field]: file }))
    const url = URL.createObjectURL(file)
    setPreviews(prev => ({ ...prev, [field]: url }))
  }

  async function uploadFile(file: File, path: string): Promise<string> {
    const supabase = createClient()
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('documents').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // التحقق من الصور المطلوبة
    if (purchaseType === 'device_sim') {
      if (!files.id_card_front || !files.id_card_back || !files.residence_card_front || !files.residence_card_back) {
        setError('يرجى رفع جميع الصور المطلوبة')
        setLoading(false)
        return
      }
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('غير مسجل')

      const timestamp = Date.now()
      let idFrontUrl = '', idBackUrl = '', resFrontUrl = '', resBackUrl = ''

      if (files.id_card_front) idFrontUrl = await uploadFile(files.id_card_front, `${user.id}/${timestamp}_id_front`)
      if (files.id_card_back) idBackUrl = await uploadFile(files.id_card_back, `${user.id}/${timestamp}_id_back`)
      if (files.residence_card_front) resFrontUrl = await uploadFile(files.residence_card_front, `${user.id}/${timestamp}_res_front`)
      if (files.residence_card_back) resBackUrl = await uploadFile(files.residence_card_back, `${user.id}/${timestamp}_res_back`)

      // إنشاء الزبون
      const { data: customer, error: custError } = await supabase
        .from('customers')
        .insert({
          full_name: form.full_name,
          father_name: form.father_name,
          grandfather_name: form.grandfather_name,
          phone: form.phone,
          address: form.address,
          id_card_front_url: idFrontUrl,
          id_card_back_url: idBackUrl,
          residence_card_front_url: resFrontUrl,
          residence_card_back_url: resBackUrl,
        })
        .select()
        .single()

      if (custError) throw custError

      // إنشاء الطلب
      const { error: reqError } = await supabase
        .from('device_requests')
        .insert({
          customer_id: customer.id,
          employee_id: user.id,
          purchase_type: purchaseType,
          subscription_type: purchaseType === 'device_sim' ? form.subscription_type : null,
          status: 'pending',
        })

      if (reqError) throw reqError

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ، يرجى المحاولة مجدداً')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="card">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a3a5c' }}>تم إرسال الطلب!</h2>
          <p className="text-gray-500 mb-6">تم إرسال الطلب للموظف الإداري للمراجعة والمصادقة</p>
          <div className="flex gap-3">
            <button onClick={() => router.push('/employee')} className="btn-primary">العودة للرئيسية</button>
            <button onClick={() => { setSuccess(false); setStep('select_type'); setForm({ full_name: '', father_name: '', grandfather_name: '', phone: '', address: '', subscription_type: '3_months' }); setFiles({ id_card_front: null, id_card_back: null, residence_card_front: null, residence_card_back: null }); setPreviews({ id_card_front: '', id_card_back: '', residence_card_front: '', residence_card_back: '' }) }} className="btn-secondary">طلب جديد</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step === 'form' ? setStep('select_type') : router.push('/employee')} className="text-gray-400 hover:text-gray-600">
          ← رجوع
        </button>
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>شراء جهاز GPS</h1>
      </div>

      {/* اختيار النوع */}
      {step === 'select_type' && (
        <div>
          <p className="text-gray-500 mb-6">اختر نوع الشراء</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: 'device_sim' as PurchaseType, title: 'جهاز + SIM كارد', desc: 'جهاز GPS مع شريحة اتصال واشتراك', icon: '📡' },
              { type: 'device_only' as PurchaseType, title: 'جهاز فقط', desc: 'جهاز GPS بدون شريحة', icon: '📦' },
            ].map(opt => (
              <button
                key={opt.type}
                onClick={() => { setPurchaseType(opt.type); setStep('form') }}
                className="bg-white rounded-2xl p-6 text-right shadow-sm hover:shadow-md transition-all border-2 hover:border-blue-200"
                style={{ borderColor: 'transparent' }}
              >
                <div className="text-4xl mb-3">{opt.icon}</div>
                <h3 className="text-lg font-bold mb-1" style={{ color: '#1a3a5c' }}>{opt.title}</h3>
                <p className="text-gray-400 text-sm">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* الاستمارة */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* نوع الشراء المختار */}
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium" style={{ background: '#1a3a5c15', color: '#1a3a5c' }}>
            <span>{purchaseType === 'device_sim' ? '📡 جهاز + SIM كارد' : '📦 جهاز فقط'}</span>
          </div>

          {/* معلومات الزبون */}
          <div className="card">
            <h3 className="text-lg font-bold mb-5" style={{ color: '#1a3a5c' }}>معلومات الزبون</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">الاسم الأول *</label>
                <input className="input-field" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required placeholder="محمد" />
              </div>
              <div>
                <label className="label">اسم الأب *</label>
                <input className="input-field" value={form.father_name} onChange={e => setForm(p => ({ ...p, father_name: e.target.value }))} required placeholder="أحمد" />
              </div>
              <div>
                <label className="label">اسم الجد *</label>
                <input className="input-field" value={form.grandfather_name} onChange={e => setForm(p => ({ ...p, grandfather_name: e.target.value }))} required placeholder="علي" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">رقم الهاتف *</label>
                <input className="input-field" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required placeholder="07XXXXXXXXX" />
              </div>
              <div>
                <label className="label">العنوان *</label>
                <input className="input-field" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} required placeholder="المحافظة / المنطقة / الشارع" />
              </div>
            </div>
          </div>

          {/* نوع الاشتراك - فقط لجهاز + SIM */}
          {purchaseType === 'device_sim' && (
            <div className="card">
              <h3 className="text-lg font-bold mb-5" style={{ color: '#1a3a5c' }}>نوع الاشتراك</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: '3_months', label: '3 أشهر', sub: 'ربع سنوي' },
                  { value: '6_months', label: '6 أشهر', sub: 'نصف سنوي' },
                  { value: 'yearly', label: 'سنوي', sub: '12 شهر' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, subscription_type: opt.value as SubscriptionType }))}
                    className="p-4 rounded-xl border-2 text-center transition-all"
                    style={{
                      borderColor: form.subscription_type === opt.value ? '#1a3a5c' : '#e2e8f0',
                      background: form.subscription_type === opt.value ? '#1a3a5c' : 'white',
                      color: form.subscription_type === opt.value ? 'white' : '#1a202c',
                    }}
                  >
                    <div className="font-bold text-lg">{opt.label}</div>
                    <div className="text-xs opacity-70 mt-1">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* رفع الصور */}
          <div className="card">
            <h3 className="text-lg font-bold mb-5" style={{ color: '#1a3a5c' }}>المستندات المطلوبة</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'id_card_front', label: 'الهوية الوطنية - الوجه الأمامي' },
                { key: 'id_card_back', label: 'الهوية الوطنية - الوجه الخلفي' },
                { key: 'residence_card_front', label: 'بطاقة السكن - الوجه الأمامي' },
                { key: 'residence_card_back', label: 'بطاقة السكن - الوجه الخلفي' },
              ].map(doc => (
                <FileUpload
                  key={doc.key}
                  label={doc.label}
                  preview={previews[doc.key as keyof typeof previews]}
                  onChange={file => handleFileChange(doc.key as keyof typeof files, file)}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm text-center">{error}</div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب للإداري ←'}
          </button>
        </form>
      )}
    </div>
  )
}

function FileUpload({ label, preview, onChange }: { label: string; preview: string; onChange: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <label className="label">{label} *</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-blue-300"
        style={{ borderColor: preview ? '#1a3a5c' : '#e2e8f0', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {preview ? (
          <img src={preview} alt={label} className="max-h-28 rounded-lg object-contain" />
        ) : (
          <div className="text-gray-400">
            <div className="text-3xl mb-2">📷</div>
            <p className="text-xs">اضغط لرفع الصورة</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files?.[0] || null)} />
    </div>
  )
}
