'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { getPendingRenewals, approveRenewal } from '@/lib/firebase/firestore'
import { formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'
import { IMG_FBANNER, IMG_VSTRIP } from '@/lib/companyFormImages'

interface RenewalRequest {
  id: string
  original_request_id: string
  customer_id: string
  employee_id: string
  subscription_type: string
  current_end: string
  status: string
  created_at: string | null
  customer: { id: string; full_name: string; father_name: string; grandfather_name: string; phone: string; address: string } | null
}

export default function AdminRenewalsPage() {
  const [renewals, setRenewals] = useState<RenewalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RenewalRequest | null>(null)
  const [approving, setApproving] = useState(false)

  async function load() {
    const data = await getPendingRenewals()
    setRenewals(data as RenewalRequest[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleApprove(renewal: RenewalRequest) {
    const user = auth.currentUser
    if (!user) return
    setApproving(true)
    await approveRenewal(renewal.id, renewal.original_request_id, user.uid, renewal.subscription_type, renewal.current_end)
    printRenewalInvoice(renewal)
    setSelected(null)
    setApproving(false)
    load()
  }

  function printRenewalInvoice(renewal: RenewalRequest) {
    const customerName = renewal.customer
      ? `${renewal.customer.full_name} ${renewal.customer.father_name} ${renewal.customer.grandfather_name}`
      : '-'
    const days = renewal.subscription_type === '3_months' ? 90 : renewal.subscription_type === '6_months' ? 180 : 365
    const now = new Date()
    const end = new Date(renewal.current_end)
    const startFrom = end > now ? end : now
    const newEnd = new Date(startFrom)
    newEnd.setDate(newEnd.getDate() + days)
    const newEndStr = newEnd.toLocaleDateString('ar-IQ')
    const subLabel = getSubscriptionLabel(renewal.subscription_type as SubscriptionType)

    const makeCopy = (copyLabel: string) => `
      <div style="width:190mm;min-height:130mm;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;border:1.5px solid #b8974a;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;">
        <img src="${IMG_FBANNER}" style="width:100%;height:auto;display:block;" />
        <div style="display:flex;flex:1;">
          <div style="flex:1;padding:10px 14px 10px 8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:12px;font-weight:bold;color:#1a3a5c;">فاتورة تجديد اشتراك</span>
              <span style="font-size:10px;color:#aaa;">نسخة: ${copyLabel}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr><td style="padding:4px 6px;color:#444;width:38%;border-bottom:1px solid #f0e8d0;">اسم الزبون</td><td style="padding:4px 6px;font-weight:bold;color:#1a3a5c;border-bottom:1px solid #f0e8d0;">${customerName}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">رقم الهاتف</td><td style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #f0e8d0;">${renewal.customer?.phone || '-'}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">العنوان</td><td style="padding:4px 6px;border-bottom:1px solid #f0e8d0;">${renewal.customer?.address || '-'}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">نوع الاشتراك</td><td style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #f0e8d0;">${subLabel}</td></tr>
              <tr><td style="padding:4px 6px;color:#444;border-bottom:1px solid #f0e8d0;">تاريخ الانتهاء السابق</td><td style="padding:4px 6px;border-bottom:1px solid #f0e8d0;">${formatDate(renewal.current_end)}</td></tr>
              <tr style="background:#fffdf5;"><td style="padding:4px 6px;color:#444;">تاريخ الانتهاء الجديد</td><td style="padding:4px 6px;font-weight:bold;color:#16a34a;">${newEndStr}</td></tr>
            </table>
            <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:11px;color:#999;border-top:1px solid #f0e8d0;padding-top:8px;">
              <span>توقيع الزبون: _______________</span>
              <span>توقيع المسؤول: _______________</span>
            </div>
          </div>
          <img src="${IMG_VSTRIP}" style="width:22px;height:auto;display:block;object-fit:cover;" />
        </div>
      </div>
    `

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>فاتورة تجديد</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        body { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8mm; align-items: center; background: white; }
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>طلبات تجديد الاشتراك 🔄</h1>
      {loading ? (
        <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>
      ) : renewals.length === 0 ? (
        <div className="card text-center py-16"><div className="text-5xl mb-4">✅</div><p className="text-gray-400 text-lg">لا توجد طلبات تجديد معلقة</p></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold">اسم الزبون</th>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold">الهاتف</th>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold">تاريخ انتهاء الاشتراك</th>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold">النوع المطلوب</th>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold">تاريخ الطلب</th>
                <th className="px-4 py-3 text-right text-gray-600 font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {r.customer ? `${r.customer.full_name} ${r.customer.father_name} ${r.customer.grandfather_name}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.customer?.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.current_end ? formatDate(r.current_end) : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{getSubscriptionLabel(r.subscription_type as SubscriptionType)}</td>
                  <td className="px-4 py-3 text-gray-500">{r.created_at ? formatDate(r.created_at) : '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(r)} className="btn-secondary text-sm px-4 py-1.5 w-auto">موافقة ومعالجة ←</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4">
            <div className="border-b p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: '#1a3a5c' }}>تأكيد التجديد</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50">
                <div><span className="text-gray-500">الاسم: </span><span className="font-semibold">{selected.customer ? `${selected.customer.full_name} ${selected.customer.father_name} ${selected.customer.grandfather_name}` : '-'}</span></div>
                <div><span className="text-gray-500">الهاتف: </span><span className="font-semibold">{selected.customer?.phone || '-'}</span></div>
                <div><span className="text-gray-500">العنوان: </span><span className="font-semibold">{selected.customer?.address || '-'}</span></div>
                <div><span className="text-gray-500">الاشتراك المطلوب: </span><span className="font-semibold">{getSubscriptionLabel(selected.subscription_type as SubscriptionType)}</span></div>
                <div><span className="text-gray-500">تاريخ انتهاء الحالي: </span><span className="font-semibold text-red-600">{selected.current_end ? formatDate(selected.current_end) : '-'}</span></div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm">
                سيتم تجديد الاشتراك تلقائياً وطباعة الفاتورة عند الموافقة
              </div>
            </div>
            <div className="border-t p-5 flex gap-3">
              <button onClick={() => handleApprove(selected)} disabled={approving} className="btn-primary flex-1">
                {approving ? 'جارٍ المعالجة...' : '✅ موافقة وطباعة فاتورة'}
              </button>
              <button onClick={() => setSelected(null)} className="px-6 py-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
