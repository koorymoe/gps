'use client'

import { useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { searchActivatedRequests, deliverToCustomer } from '@/lib/firebase/firestore'
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
  const [loading, setLoading] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!search.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await searchActivatedRequests(search.trim())
      setResults(data as ActivatedRequest[])
      if (data.length === 0) setError('لا توجد نتائج مطابقة للبحث')
    } catch {
      setError('حدث خطأ أثناء البحث')
    }
    setLoading(false)
  }

  async function handleDeliver(req: ActivatedRequest) {
    setDelivering(true)
    setError('')
    try {
      const user = auth.currentUser
      if (!user) throw new Error('غير مسجل')
      await deliverToCustomer(req.id, user.uid)
      printInvoice(req)
      setSuccess(req.id)
      setResults(prev => prev.filter(r => r.id !== req.id))
    } catch {
      setError('حدث خطأ أثناء التسليم')
    }
    setDelivering(false)
  }

  function printInvoice(req: ActivatedRequest) {
    const customerName = req.customer
      ? `${req.customer.full_name} ${req.customer.father_name} ${req.customer.grandfather_name}`
      : '-'
    const subLabel = req.subscription_type
      ? getSubscriptionLabel(req.subscription_type as SubscriptionType)
      : 'لا يوجد'
    const actDate = req.activation_date ? formatDate(req.activation_date) : '-'
    const expDate = req.subscription_end ? formatDate(req.subscription_end) : '-'
    const gpsNum = req.gps_number || '-'
    const residenceNum = req.residence_card_number || '-'

    const makeCopy = (copyLabel: string) => `
      <div style="width:190mm;min-height:140mm;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;border:1.5px solid #b8974a;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;">
        <img src="${IMG_FBANNER}" style="width:100%;height:auto;display:block;" />
        <div style="display:flex;flex:1;">
          <div style="flex:1;padding:10px 14px 10px 8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <h2 style="font-size:14px;font-weight:bold;color:#1a3a5c;margin:0;">استمارة تسليم جهاز GPS</h2>
              <div style="text-align:left;">
                <span style="font-size:11px;color:#888;">نسخة: ${copyLabel}</span><br/>
                <span style="font-size:10px;color:#aaa;">رقم الطلب: ${req.id.slice(-6).toUpperCase()}</span>
              </div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr><td style="padding:4px 6px;color:#444;width:38%;border-bottom:1px solid #f0e8d0;">اسم الزبون</td><td style="padding:4px 6px;font-weight:bold;color:#1a3a5c;border-bottom:1px solid #f0e8d0;">${customerName}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">رقم الهاتف</td><td style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #f0e8d0;">${req.customer?.phone || '-'}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">العنوان</td><td style="padding:4px 6px;border-bottom:1px solid #f0e8d0;">${req.customer?.address || '-'}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">رقم الجهاز</td><td style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #f0e8d0;">${gpsNum}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">رقم بطاقة السكن</td><td style="padding:4px 6px;border-bottom:1px solid #f0e8d0;">${residenceNum}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">نوع الاشتراك</td><td style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #f0e8d0;">${subLabel}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">تاريخ التفعيل</td><td style="padding:4px 6px;font-weight:bold;color:#16a34a;border-bottom:1px solid #f0e8d0;">${actDate}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;">تاريخ الانتهاء</td><td style="padding:4px 6px;font-weight:bold;color:#dc2626;">${expDate}</td></tr>
            </table>
            <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:11px;color:#999;border-top:1px solid #f0e8d0;padding-top:8px;">
              <span>توقيع الزبون: _______________</span>
              <span>توقيع الموظف: _______________</span>
            </div>
          </div>
          <img src="${IMG_VSTRIP}" style="width:22px;height:auto;display:block;object-fit:cover;" />
        </div>
      </div>
    `

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>استمارة تسليم جهاز GPS</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        body { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8mm; align-items: center; background: white; }
        @media print { body { display: block; } }
      </style></head>
      <body>
        ${makeCopy('الزبون')}
        <div style="border-top:2px dashed #ccc;width:100%;margin:2mm 0;"></div>
        ${makeCopy('الشركة')}
        <script>window.onload = function(){ window.print(); window.close(); }<\/script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>تسليم جهاز GPS 📦</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-4 text-center">
          ✅ تم تسليم الجهاز وطباعة الاستمارة بنجاح
        </div>
      )}

      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#1a3a5c' }}>البحث عن الجهاز المفعّل</h3>
        <div className="flex gap-3">
          <input
            className="input-field flex-1"
            placeholder="ابحث باسم الزبون أو رقم الهاتف أو رقم الجهاز..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ minWidth: 0 }}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary"
            style={{ width: 'auto', flexShrink: 0, padding: '0.75rem 2rem' }}
          >
            {loading ? 'جارٍ البحث...' : 'بحث'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map(req => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg mb-1">
                    {req.customer
                      ? `${req.customer.full_name} ${req.customer.father_name} ${req.customer.grandfather_name}`
                      : '-'}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                    <span>📞 {req.customer?.phone || '-'}</span>
                    <span>📦 رقم الجهاز: <strong>{req.gps_number || '-'}</strong></span>
                    <span>📋 نوع الاشتراك: {req.subscription_type ? getSubscriptionLabel(req.subscription_type as SubscriptionType) : '-'}</span>
                    <span>🏠 رقم بطاقة السكن: {req.residence_card_number || '-'}</span>
                    {req.activation_date && (
                      <span style={{ color: '#16a34a' }}>✅ تاريخ التفعيل: {formatDate(req.activation_date)}</span>
                    )}
                    {req.subscription_end && (
                      <span style={{ color: '#dc2626' }}>⏰ تاريخ الانتهاء: {formatDate(req.subscription_end)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeliver(req)}
                  disabled={delivering}
                  className="btn-primary w-auto px-4 py-2 text-sm whitespace-nowrap"
                >
                  {delivering ? 'جارٍ...' : 'تسليم الجهاز وطباعة الاستمارة 🖨️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
