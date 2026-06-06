'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { getAllActivatedRequests, searchActivatedRequests, deliverToCustomer, getRecentlyDelivered } from '@/lib/firebase/firestore'
import { IMG_FBANNER, IMG_VSTRIP } from '@/lib/companyFormImages'
import { formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'

interface ActivatedRequest {
  id: string
  gps_number?: string
  residence_card_number?: string
  subscription_type?: string
  activation_date?: string | null
  subscription_end?: string | null
  delivered_to_customer_at?: string | null
  customer: {
    id: string
    full_name: string
    father_name: string
    grandfather_name: string
    phone: string
    address: string
  }
  [key: string]: unknown
}

export default function DeliveryPage() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ActivatedRequest[]>([])
  const [delivered, setDelivered] = useState<ActivatedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [delivering, setDelivering] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'pending' | 'delivered'>('pending')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [pending, recent] = await Promise.all([
        getAllActivatedRequests(),
        getRecentlyDelivered(),
      ])
      setResults(pending as ActivatedRequest[])
      setDelivered(recent as ActivatedRequest[])
    } catch {
      setError('حدث خطأ أثناء التحميل')
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleSearch() {
    if (!search.trim()) { loadAll(); return }
    setSearching(true)
    setError('')
    try {
      const data = await searchActivatedRequests(search.trim())
      setResults(data as ActivatedRequest[])
      if (data.length === 0) setError('لا توجد نتائج مطابقة')
    } catch {
      setError('حدث خطأ أثناء البحث')
    }
    setSearching(false)
  }

  async function handleDeliver(req: ActivatedRequest) {
    setDelivering(req.id)
    setError('')
    try {
      const user = auth.currentUser
      if (!user) throw new Error('غير مسجل')
      await deliverToCustomer(req.id, user.uid)
      printInvoice(req)
      setResults(prev => prev.filter(r => r.id !== req.id))
      loadAll()
    } catch {
      setError('حدث خطأ أثناء التسليم')
    }
    setDelivering(null)
  }

  function printInvoice(req: ActivatedRequest) {
    const baseUrl = window.location.origin
    const bannerUrl = `${baseUrl}/form-fbanner.png`
    const vstripUrl = `${baseUrl}/form-vstrip.png`
    const customerName = req.customer
      ? `${req.customer.full_name} ${req.customer.father_name} ${req.customer.grandfather_name}`
      : '-'
    const subLabel = req.subscription_type ? getSubscriptionLabel(req.subscription_type as SubscriptionType) : 'لا يوجد'
    const gpsNum = req.gps_number || '___________'
    const residenceNum = req.residence_card_number || '___________'
    const nationalId = String((req as Record<string, unknown>).national_id_number || '___________')
    const simNum = String((req as Record<string, unknown>).sim_number || '___________')
    const accountNum = req.id.slice(-6).toUpperCase()
    const today = new Date().toLocaleDateString('ar-IQ')

    const contractTerms = `
      <div style="margin-top:8px;">
        <div style="font-weight:bold;font-size:11px;margin-bottom:4px;color:#1a3a5c;border-bottom:1px solid #c9a84c;padding-bottom:2px;">بنود العقد</div>
        <ol style="margin:0;padding-right:18px;font-size:9.5px;line-height:1.7;color:#222;">
          <li>يلتزم المشتري بدفع الاشتراك الشهري في موعده المحدد، وفي حال التأخر يتحمل المشتري المسؤولية الكاملة عن أي انقطاع في الخدمة.</li>
          <li>الجهاز ملك للمشتري وعليه المحافظة عليه، وفي حال تلفه أو فقدانه يتحمل المشتري تكلفة الاستبدال كاملاً.</li>
          <li>لا تتحمل الشركة أي مسؤولية عن الضرر الناجم عن انقطاع الإنترنت أو انقطاع التيار الكهربائي أو أي قوة قاهرة.</li>
          <li>يحق للشركة إيقاف الخدمة فوراً في حال مخالفة أي بند من بنود هذا العقد.</li>
          <li>لا يحق للمشتري نقل الجهاز أو الشريحة إلى شخص آخر دون إشعار الشركة خطياً.</li>
          <li>في حال الرغبة بإلغاء الاشتراك يجب إشعار الشركة قبل أسبوع من تاريخ الاستحقاق.</li>
          <li>يتعهد المشتري بعدم استخدام الجهاز لأغراض غير مشروعة.</li>
          <li>يُعدّ هذا العقد ملزماً لكلا الطرفين ويخضع لقوانين جمهورية العراق.</li>
          <li>في حال فقدان الجهاز أو سرقته يجب إبلاغ الشركة فوراً خلال ٢٤ ساعة.</li>
          <li>يلتزم المشتري بعدم فك الجهاز أو التلاعب في برمجته تحت طائلة إلغاء الضمان.</li>
          <li>تلتزم الشركة بتقديم الدعم الفني خلال أوقات الدوام الرسمي فقط.</li>
          <li>يحق للشركة تعديل أسعار الاشتراك مع إشعار المشتري قبل شهر من التعديل.</li>
          <li>يُقر المشتري بأنه اطلع على جميع بنود هذا العقد ووافق عليها طوعاً واختياراً.</li>
        </ol>
      </div>
    `

    const makeCopy = (copyLabel: string) => `
      <div style="width:100%;height:139mm;box-sizing:border-box;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;background:white;">
        <div style="border:2px solid #b8974a;border-radius:6px;overflow:hidden;height:100%;display:flex;flex-direction:column;justify-content:space-between;">
          <div style="display:flex;flex:1;overflow:hidden;min-height:0;">
            <div style="flex:1;padding:6px 12px 6px 6px;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <h2 style="font-size:12px;font-weight:bold;color:#1a3a5c;margin:0;">تعهد شراء جهاز GPS مع خط</h2>
                <span style="font-size:8px;background:#1a3a5c;color:white;padding:2px 8px;border-radius:10px;">نسخة ${copyLabel}</span>
              </div>
              <p style="font-size:8px;color:#333;margin:0 0 4px 0;line-height:1.5;border:1px solid #e8d8b0;padding:4px 7px;border-radius:4px;background:#fffdf5;">
                إني <strong>${customerName}</strong> الموقع أدناه اشتريت جهاز GPS من <strong>(شركة الأماني للتجارة العامة والاستثمارات العقارية والوكالات التجارية م.م)</strong> وأوافق على جميع بنود هذا العقد ولأجله وقعت أدناه
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:8.5px;margin-bottom:4px;">
                <tr>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;width:30%;">رقم حساب المشتري</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;font-weight:bold;color:#1a3a5c;width:20%;">${accountNum}</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;width:30%;">رقم الهاتف</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;font-weight:bold;width:20%;">${req.customer?.phone || '___________'}</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">عنوان السكن</td>
                  <td colspan="3" style="padding:3px 6px;border:1px solid #d4b896;">${req.customer?.address || '___________'}</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">رقم البطاقة الوطنية</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;">${nationalId}</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">رقم بطاقة السكن</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;">${residenceNum}</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">نوع الاشتراك</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;font-weight:bold;">${subLabel}</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">نوع المركبة</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;">___________</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">رقم المركبة أو الشاسيه</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;">___________</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">اللون</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;">___________</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">ID GPS (رقم الجهاز)</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;font-weight:bold;color:#1a3a5c;">${gpsNum}</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;background:#f8f4ee;font-weight:600;">رقم الشريحة</td>
                  <td style="padding:3px 6px;border:1px solid #d4b896;font-weight:bold;">${simNum}</td>
                </tr>
              </table>
              <div style="margin-bottom:4px;">
                <div style="font-weight:bold;font-size:9px;margin-bottom:2px;color:#1a3a5c;border-bottom:1px solid #c9a84c;padding-bottom:2px;">بنود العقد</div>
                <ol style="margin:0;padding-right:15px;font-size:7.5px;line-height:1.6;color:#222;columns:2;column-gap:12px;">
                  <li>يلتزم المشتري بدفع الاشتراك الشهري في موعده المحدد، وفي حال التأخر يتحمل المشتري المسؤولية الكاملة عن أي انقطاع في الخدمة.</li>
                  <li>الجهاز ملك للمشتري وعليه المحافظة عليه، وفي حال تلفه أو فقدانه يتحمل المشتري تكلفة الاستبدال كاملاً.</li>
                  <li>لا تتحمل الشركة أي مسؤولية عن الضرر الناجم عن انقطاع الإنترنت أو انقطاع التيار الكهربائي أو أي قوة قاهرة.</li>
                  <li>يحق للشركة إيقاف الخدمة فوراً في حال مخالفة أي بند من بنود هذا العقد.</li>
                  <li>لا يحق للمشتري نقل الجهاز أو الشريحة إلى شخص آخر دون إشعار الشركة خطياً.</li>
                  <li>في حال الرغبة بإلغاء الاشتراك يجب إشعار الشركة قبل أسبوع من تاريخ الاستحقاق.</li>
                  <li>يتعهد المشتري بعدم استخدام الجهاز لأغراض غير مشروعة.</li>
                  <li>يُعدّ هذا العقد ملزماً لكلا الطرفين ويخضع لقوانين جمهورية العراق.</li>
                  <li>في حال فقدان الجهاز أو سرقته يجب إبلاغ الشركة فوراً خلال ٢٤ ساعة.</li>
                  <li>يلتزم المشتري بعدم فك الجهاز أو التلاعب في برمجته تحت طائلة إلغاء الضمان.</li>
                  <li>تلتزم الشركة بتقديم الدعم الفني خلال أوقات الدوام الرسمي فقط.</li>
                  <li>يحق للشركة تعديل أسعار الاشتراك مع إشعار المشتري قبل شهر من التعديل.</li>
                  <li>يُقر المشتري بأنه اطلع على جميع بنود هذا العقد ووافق عليها طوعاً واختياراً.</li>
                </ol>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;font-size:8px;border-top:1px dashed #c9a84c;padding-top:4px;">
                <div style="text-align:center;"><div style="height:22px;border-bottom:1px solid #333;margin-bottom:3px;"></div><div>توقيع المشتري</div></div>
                <div style="text-align:center;"><div style="height:22px;border-bottom:1px solid #333;margin-bottom:3px;"></div><div>اسم الفني</div></div>
                <div style="text-align:center;"><div style="height:22px;border-bottom:1px solid #333;margin-bottom:3px;"></div><div>توقيع مخول</div></div>
                <div style="text-align:center;"><div style="height:22px;border-bottom:1px solid #333;margin-bottom:3px;font-size:9px;font-weight:bold;padding-top:5px;">${today}</div><div>التاريخ</div></div>
              </div>
            </div>
            <img src="${vstripUrl}" style="width:32px;display:block;object-fit:cover;" />
          </div>
          <img src="${bannerUrl}" style="width:100%;display:block;flex-shrink:0;" />
        </div>
      </div>
    `

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>تعهد شراء جهاز GPS مع خط</title>
      <style>
        @page { size: A4 portrait; margin: 5mm; }
        html, body { margin: 0; padding: 0; background: white; }
        .page { width: 200mm; display: flex; flex-direction: column; gap: 3mm; }
        .divider { border: none; border-top: 2px dashed #b8974a; margin: 0; }
      </style></head>
      <body>
        <div class="page">
          ${makeCopy('الزبون')}
          <hr class="divider" />
          ${makeCopy('الشركة')}
        </div>
        <script>window.onload = function(){ window.print(); window.close(); }<\/script>
      </body></html>
    `)
    win.document.close()
  }

  const customerFullName = (req: ActivatedRequest) =>
    req.customer ? `${req.customer.full_name} ${req.customer.father_name} ${req.customer.grandfather_name}` : '-'

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>تسليم جهاز GPS 📦</h1>

      {/* تبويبات */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('pending')}
          className="px-5 py-2 rounded-xl font-semibold text-sm transition-all"
          style={{ background: tab === 'pending' ? '#1a3a5c' : 'white', color: tab === 'pending' ? 'white' : '#1a3a5c', border: '2px solid #1a3a5c' }}
        >
          📦 بانتظار التسليم ({results.length})
        </button>
        <button
          onClick={() => setTab('delivered')}
          className="px-5 py-2 rounded-xl font-semibold text-sm transition-all"
          style={{ background: tab === 'delivered' ? '#1a3a5c' : 'white', color: tab === 'delivered' ? 'white' : '#1a3a5c', border: '2px solid #1a3a5c' }}
        >
          ✅ تم التسليم مؤخراً ({delivered.length})
        </button>
      </div>

      {tab === 'pending' && (
        <>
          {/* البحث */}
          <div className="card mb-4">
            <div className="flex gap-3">
              <input
                className="input-field flex-1"
                placeholder="ابحث باسم الزبون أو رقم الهاتف أو رقم الجهاز..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ minWidth: 0 }}
              />
              <button onClick={handleSearch} disabled={searching} className="btn-secondary" style={{ width: 'auto', flexShrink: 0, padding: '0.75rem 1.5rem' }}>
                {searching ? '...' : 'بحث'}
              </button>
              {search && (
                <button onClick={() => { setSearch(''); loadAll() }} className="btn-secondary" style={{ width: 'auto', flexShrink: 0, padding: '0.75rem 1rem' }}>
                  ✕
                </button>
              )}
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
          ) : results.length === 0 ? (
            <div className="text-center text-gray-400 py-20">لا توجد أجهزة بانتظار التسليم</div>
          ) : (
            <div className="space-y-4">
              {results.map(req => (
                <div key={req.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-lg mb-1">{customerFullName(req)}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                        <span>📞 {req.customer?.phone || '-'}</span>
                        <span>📦 رقم الجهاز: <strong>{req.gps_number || '-'}</strong></span>
                        <span>📋 {req.subscription_type ? getSubscriptionLabel(req.subscription_type as SubscriptionType) : '-'}</span>
                        <span>🏠 {req.residence_card_number || '-'}</span>
                        {req.activation_date && <span style={{ color: '#16a34a' }}>✅ {formatDate(req.activation_date)}</span>}
                        {req.subscription_end && <span style={{ color: '#dc2626' }}>⏰ {formatDate(req.subscription_end)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeliver(req)}
                      disabled={delivering === req.id}
                      className="btn-primary"
                      style={{ width: 'auto', flexShrink: 0, padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                    >
                      {delivering === req.id ? 'جارٍ...' : 'تسليم وطباعة 🖨️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'delivered' && (
        <div className="space-y-4">
          {delivered.length === 0 ? (
            <div className="text-center text-gray-400 py-20">لا توجد تسليمات مؤخراً</div>
          ) : (
            delivered.map(req => (
              <div key={req.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-lg mb-1">{customerFullName(req)}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                      <span>📞 {req.customer?.phone || '-'}</span>
                      <span>📦 رقم الجهاز: <strong>{req.gps_number || '-'}</strong></span>
                      <span>📋 {req.subscription_type ? getSubscriptionLabel(req.subscription_type as SubscriptionType) : '-'}</span>
                      {req.delivered_to_customer_at && (
                        <span style={{ color: '#16a34a' }}>✅ سُلّم: {formatDate(req.delivered_to_customer_at as string)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => printInvoice(req)}
                    className="btn-secondary"
                    style={{ width: 'auto', flexShrink: 0, padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                  >
                    🖨️ إعادة طباعة
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
