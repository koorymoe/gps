'use client'

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { getPendingRequests, deliverRequest } from '@/lib/firebase/firestore'
import { formatDate, getSubscriptionLabel } from '@/lib/utils'
import { SubscriptionType } from '@/types'

interface Request {
  id: string; purchase_type: string; subscription_type: string | null; status: string; created_at: { seconds: number } | string
  customer: { full_name: string; father_name: string; grandfather_name: string; phone: string; address: string; id_card_front_url: string; id_card_back_url: string; residence_card_front_url: string; residence_card_back_url: string } | null
  employee: { full_name: string } | null
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Request | null>(null)
  const [delivering, setDelivering] = useState(false)

  async function load() {
    const data = await getPendingRequests()
    setRequests(data as Request[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleDeliver(req: Request) {
    setDelivering(true)
    const user = auth.currentUser
    await deliverRequest(req.id, user?.uid || '', req.subscription_type)
    window.print()
    setSelected(null)
    setDelivering(false)
    load()
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
              <button onClick={() => setSelected(req)} className="btn-secondary text-sm px-4 py-2 mr-4 w-auto">مراجعة ←</button>
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
              <div className="text-center border-b pb-4">
                <h3 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>شركة الأماني لخدمات GPS</h3>
                <p className="text-gray-500 text-sm mt-1">فاتورة شراء جهاز</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="الاسم الكامل" value={`${selected.customer?.full_name} ${selected.customer?.father_name} ${selected.customer?.grandfather_name}`} />
                <InfoRow label="رقم الهاتف" value={selected.customer?.phone || '-'} />
                <InfoRow label="العنوان" value={selected.customer?.address || '-'} />
                <InfoRow label="نوع الشراء" value={typeLabel(selected.purchase_type)} />
                {selected.subscription_type && <InfoRow label="نوع الاشتراك" value={getSubscriptionLabel(selected.subscription_type as SubscriptionType)} />}
                <InfoRow label="تاريخ الطلب" value={getDate(selected.created_at)} />
              </div>
              {selected.customer?.id_card_front_url && (
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: '#1a3a5c' }}>المستندات</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selected.customer.id_card_front_url && <DocImage url={selected.customer.id_card_front_url} label="الهوية - أمامي" />}
                    {selected.customer.id_card_back_url && <DocImage url={selected.customer.id_card_back_url} label="الهوية - خلفي" />}
                    {selected.customer.residence_card_front_url && <DocImage url={selected.customer.residence_card_front_url} label="السكن - أمامي" />}
                    {selected.customer.residence_card_back_url && <DocImage url={selected.customer.residence_card_back_url} label="السكن - خلفي" />}
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t p-5 flex gap-3">
              <button onClick={() => handleDeliver(selected)} disabled={delivering} className="btn-primary flex-1">
                {delivering ? 'جارٍ التسليم...' : '✅ تسليم وطباعة الفاتورتين'}
              </button>
              <button onClick={() => setSelected(null)} className="px-6 py-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2"><span className="font-semibold text-gray-500 min-w-fit">{label}:</span><span className="text-gray-800">{value}</span></div>
}
function DocImage({ url, label }: { url: string; label: string }) {
  return <div className="border rounded-lg overflow-hidden"><p className="text-xs text-gray-500 p-2 bg-gray-50 border-b">{label}</p><img src={url} alt={label} className="w-full object-contain max-h-36" /></div>
}
