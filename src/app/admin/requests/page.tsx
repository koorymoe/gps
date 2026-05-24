'use client'

import { useEffect, useRef, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { getPendingRequests, deliverRequest } from '@/lib/firebase/firestore'
import { formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'
import { IMG_VSTRIP, IMG_FBANNER } from '@/lib/companyFormImages'

interface Request {
  id: string; purchase_type: string; subscription_type: string | null; status: string
  created_at: { seconds: number } | string; price?: number; invoice_photo_url?: string
  customer: { full_name: string; father_name: string; grandfather_name: string; phone: string; address: string; id_card_front_url: string; id_card_back_url: string; residence_card_front_url: string; residence_card_back_url: string } | null
  employee: { full_name: string } | null
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Request | null>(null)
  const [delivering, setDelivering] = useState(false)
  const [activationDate, setActivationDate] = useState('')
  const [deviceChecks, setDeviceChecks] = useState({ checked: false, activated: false, delivered: false })
  const printRef = useRef<HTMLDivElement>(null)

  async function load() {
    const data = await getPendingRequests()
    setRequests(data as Request[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleDeliver(req: Request) {
    if (req.purchase_type === 'device_only') {
      if (!deviceChecks.checked || !deviceChecks.activated || !deviceChecks.delivered) {
        alert('يرجى تأكيد جميع الخطوات أولاً')
        return
      }
    } else if (req.subscription_type && !activationDate) {
      alert('يرجى إدخال تاريخ التفعيل أولاً')
      return
    }
    setDelivering(true)
    const user = auth.currentUser
    const checks = req.purchase_type === 'device_only' ? deviceChecks : undefined
    await deliverRequest(req.id, user?.uid || '', req.subscription_type, activationDate || null, checks)
    setSelected(null)
    setActivationDate('')
    setDeviceChecks({ checked: false, activated: false, delivered: false })
    setDelivering(false)
    load()
  }

  function handlePrint(req: Request) {
    const customerName = req.customer ? `${req.customer.full_name} ${req.customer.father_name} ${req.customer.grandfather_name}` : '-'
    const subLabel = req.subscription_type ? getSubscriptionLabel(req.subscription_type as SubscriptionType) : 'لا يوجد'
    const purchaseDate = formatDate(typeof req.created_at === 'string' ? req.created_at : new Date((req.created_at as { seconds: number }).seconds * 1000).toISOString())
    const actDate = activationDate ? new Date(activationDate).toLocaleDateString('ar-IQ') : '-'
    const expDate = activationDate && req.subscription_type ? (() => {
      const days = req.subscription_type === '3_months' ? 90 : req.subscription_type === '6_months' ? 180 : 365
      const d = new Date(activationDate); d.setDate(d.getDate() + days)
      return d.toLocaleDateString('ar-IQ')
    })() : '-'
    const price = req.price ? req.price.toLocaleString() + ' د.ع' : '-'

    const makeCopy = (copyLabel: string) => `
      <div style="width:190mm;min-height:130mm;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;border:1.5px solid #b8974a;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;">
        <!-- header banner -->
        <img src="${IMG_FBANNER}" style="width:100%;height:auto;display:block;" />
        <!-- body -->
        <div style="display:flex;flex:1;">
          <!-- content -->
          <div style="flex:1;padding:10px 14px 10px 8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:11px;color:#888;">نسخة: ${copyLabel}</span>
              <span style="font-size:10px;color:#aaa;">رقم الطلب: ${req.id.slice(-6).toUpperCase()}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr><td style="padding:4px 6px;color:#444;width:38%;border-bottom:1px solid #f0e8d0;">اسم الزبون</td><td style="padding:4px 6px;font-weight:bold;color:#1a3a5c;border-bottom:1px solid #f0e8d0;">${customerName}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">رقم الهاتف</td><td style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #f0e8d0;">${req.customer?.phone || '-'}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">العنوان</td><td style="padding:4px 6px;border-bottom:1px solid #f0e8d0;">${req.customer?.address || '-'}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">نوع الاشتراك</td><td style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #f0e8d0;">${subLabel}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">المبلغ المدفوع</td><td style="padding:4px 6px;font-weight:bold;color:#b8974a;font-size:14px;border-bottom:1px solid #f0e8d0;">${price}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">تاريخ الشراء</td><td style="padding:4px 6px;border-bottom:1px solid #f0e8d0;">${purchaseDate}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">تاريخ التفعيل</td><td style="padding:4px 6px;font-weight:bold;color:#16a34a;border-bottom:1px solid #f0e8d0;">${actDate}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;">تاريخ الانتهاء</td><td style="padding:4px 6px;font-weight:bold;color:#dc2626;">${expDate}</td></tr>
            </table>
            <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:11px;color:#999;border-top:1px solid #f0e8d0;padding-top:8px;">
              <span>توقيع الزبون: _______________</span>
              <span>توقيع المسؤول: _______________</span>
            </div>
          </div>
          <!-- vertical strip -->
          <img src="${IMG_VSTRIP}" style="width:22px;height:auto;display:block;object-fit:cover;" />
        </div>
      </div>
    `

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>فاتورة</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        body { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8mm; align-items: center; background: white; }
        @media print { body { display: block; } .page-break { page-break-after: avoid; } }
      </style></head>
      <body>
        ${makeCopy('الزبون')}
        <div style="border-top:2px dashed #ccc;width:100%;margin:2mm 0;"></div>
        ${makeCopy('الشركة')}
        <script>window.onload = function(){ window.print(); window.close(); }</script>
      </body></html>
    `)
    win.document.close()
  }

  function getDate(val: { seconds: number } | string) {
    if (typeof val === 'string') return formatDate(val)
    if (val?.seconds) return formatDate(new Date(val.seconds * 1000).toISOString())
    return '-'
  }

  const typeLabel = (t: string) => t === 'device_sim' ? 'جهاز + SIM كارد' : 'جهاز فقط'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>الطلبات المعلقة 📋</h1>
      {loading ? (
        <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16"><div className="text-5xl mb-4">✅</div><p className="text-gray-400 text-lg">لا توجد طلبات معلقة</p></div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-gray-800">{req.customer ? `${req.customer.full_name} ${req.customer.father_name} ${req.customer.grandfather_name}` : '-'}</span>
                  <span className="badge bg-purple-50 text-purple-700">{typeLabel(req.purchase_type)}</span>
                  {req.subscription_type && <span className="badge bg-blue-50 text-blue-700">{getSubscriptionLabel(req.subscription_type as SubscriptionType)}</span>}
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>📞 {req.customer?.phone}</span>
                  <span>📍 {req.customer?.address}</span>
                  <span>👤 {req.employee?.full_name}</span>
                  <span>📅 {getDate(req.created_at)}</span>
                </div>
              </div>
              <button onClick={() => { setSelected(req); setActivationDate(''); setDeviceChecks({ checked: false, activated: false, delivered: false }) }} className="btn-secondary text-sm px-4 py-2 mr-4 w-auto">مراجعة ←</button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: '#1a3a5c' }}>مراجعة الطلب</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="الاسم الكامل" value={`${selected.customer?.full_name} ${selected.customer?.father_name} ${selected.customer?.grandfather_name}`} />
                <InfoRow label="رقم الهاتف" value={selected.customer?.phone || '-'} />
                <InfoRow label="العنوان" value={selected.customer?.address || '-'} />
                <InfoRow label="نوع الشراء" value={typeLabel(selected.purchase_type)} />
                {selected.subscription_type && <InfoRow label="نوع الاشتراك" value={getSubscriptionLabel(selected.subscription_type as SubscriptionType)} />}
                {selected.price ? <InfoRow label="المبلغ" value={`${selected.price.toLocaleString()} د.ع`} /> : null}
                <InfoRow label="تاريخ الطلب" value={getDate(selected.created_at)} />
              </div>

              {selected.purchase_type === 'device_only' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-green-800 mb-3">تأكيد تسليم الجهاز</p>
                  {[
                    { key: 'checked', label: '✅ تم فحص الجهاز' },
                    { key: 'activated', label: '✅ تم تفعيل الجهاز' },
                    { key: 'delivered', label: '✅ تم تسليم الجهاز' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deviceChecks[key as keyof typeof deviceChecks]}
                        onChange={e => setDeviceChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              ) : selected.subscription_type ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <label className="block text-sm font-bold text-blue-800 mb-2">📅 تاريخ التفعيل (مطلوب) *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={activationDate}
                    onChange={e => setActivationDate(e.target.value)}
                  />
                  {activationDate && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-500">تاريخ التفعيل</div>
                        <div className="font-bold text-green-700">{new Date(activationDate).toLocaleDateString('ar-IQ')}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-500">تاريخ الانتهاء</div>
                        <div className="font-bold text-red-600">{(() => {
                          const days = selected.subscription_type === '3_months' ? 90 : selected.subscription_type === '6_months' ? 180 : 365
                          const d = new Date(activationDate); d.setDate(d.getDate() + days)
                          return d.toLocaleDateString('ar-IQ')
                        })()}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {selected.customer?.id_card_front_url && (
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: '#1a3a5c' }}>وثائق الهوية</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selected.customer.id_card_front_url && <DocImage url={selected.customer.id_card_front_url} label="الهوية - أمامي" />}
                    {selected.customer.id_card_back_url && <DocImage url={selected.customer.id_card_back_url} label="الهوية - خلفي" />}
                    {selected.customer.residence_card_front_url && <DocImage url={selected.customer.residence_card_front_url} label="السكن - أمامي" />}
                    {selected.customer.residence_card_back_url && <DocImage url={selected.customer.residence_card_back_url} label="السكن - خلفي" />}
                  </div>
                </div>
              )}

              {selected.invoice_photo_url && (
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: '#1a3a5c' }}>صورة الفاتورة</h4>
                  <img src={selected.invoice_photo_url} alt="الفاتورة" className="w-full max-h-64 object-contain rounded-xl border" />
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t p-5 flex gap-3">
              <button
                onClick={() => handleDeliver(selected)}
                disabled={delivering || (selected.purchase_type === 'device_only' && (!deviceChecks.checked || !deviceChecks.activated || !deviceChecks.delivered))}
                className="btn-primary flex-1"
              >
                {delivering ? 'جارٍ التفعيل...' : 'تفعيل الجهاز ✅'}
              </button>
              <button onClick={() => setSelected(null)} className="px-6 py-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">إغلاق</button>
            </div>
          </div>
        </div>
      )}
      <div ref={printRef} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2"><span className="font-semibold text-gray-500 min-w-fit">{label}:</span><span className="text-gray-800">{value}</span></div>
}
function DocImage({ url, label }: { url: string; label: string }) {
  return <div className="border rounded-lg overflow-hidden"><p className="text-xs text-gray-500 p-2 bg-gray-50 border-b">{label}</p><img src={url} alt={label} className="w-full object-contain max-h-36" /></div>
}
