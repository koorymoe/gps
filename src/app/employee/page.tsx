'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase/config'
import { getMyDeviceRequests } from '@/lib/firebase/firestore'
import { formatDate } from '@/lib/utils'

interface MyRequest {
  id: string
  purchase_type: string
  status: string
  created_at: string | null
  customer: { full_name: string; father_name: string; grandfather_name: string } | null
}

export default function EmployeeDashboard() {
  const router = useRouter()
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])
  const [loadingReqs, setLoadingReqs] = useState(true)

  useEffect(() => {
    const user = auth.currentUser
    if (user) {
      getMyDeviceRequests(user.uid).then(data => {
        setMyRequests((data as MyRequest[]).slice(0, 10))
        setLoadingReqs(false)
      })
    } else {
      setLoadingReqs(false)
    }
  }, [])

  const services = [
    {
      title: 'شراء جهاز',
      description: 'تسجيل طلب شراء جهاز GPS جديد',
      icon: '🛒',
      color: '#1a3a5c',
      href: '/employee/purchase',
    },
    {
      title: 'تجديد اشتراك',
      description: 'إرسال طلب تجديد اشتراك لزبون موجود',
      icon: '🔄',
      color: '#2d6a4f',
      href: '/employee/renewal',
    },
    {
      title: 'صيانة',
      description: 'تسجيل طلب صيانة جهاز',
      icon: '🔧',
      color: '#7b3f00',
      href: '/employee/maintenance',
    },
  ]

  function getStatusBadge(status: string) {
    if (status === 'delivered') return <span className="badge status-badge-delivered">تم التسليم ✅</span>
    return <span className="badge status-badge-pending">في الانتظار</span>
  }

  const typeLabel = (t: string) => t === 'device_sim' ? 'جهاز + SIM' : t === 'device_only' ? 'جهاز فقط' : t

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>مرحباً بك في نظام الأماني 👋</h1>
        <p className="text-gray-500 mt-1">اختر الخدمة التي تريد تقديمها للزبون</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map(service => (
          <div
            key={service.title}
            onClick={() => router.push(service.href)}
            className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ cursor: 'pointer' }}
          >
            <div className="h-2" style={{ background: service.color }} />
            <div className="p-6">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ background: service.color + '15' }}
              >
                {service.icon}
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: service.color }}>{service.title}</h3>
              <p className="text-gray-500 text-sm">{service.description}</p>
            </div>
            <div className="px-6 pb-5">
              <div
                className="w-full py-2.5 rounded-lg text-white text-sm font-semibold text-center transition-opacity"
                style={{ background: service.color }}
              >
                ابدأ الآن ←
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#1a3a5c' }}>طلباتي الأخيرة</h2>
        {loadingReqs ? (
          <div className="card text-center text-gray-400 py-8">جارٍ التحميل...</div>
        ) : myRequests.length === 0 ? (
          <div className="card text-center text-gray-400 py-8">لا توجد طلبات بعد</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="px-4 py-3 text-right text-gray-600 font-semibold">اسم الزبون</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-semibold">نوع الشراء</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((req, i) => (
                  <tr key={req.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {req.customer ? `${req.customer.full_name} ${req.customer.father_name} ${req.customer.grandfather_name}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{typeLabel(req.purchase_type)}</td>
                    <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                    <td className="px-4 py-3 text-gray-500">{req.created_at ? formatDate(req.created_at) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
