'use client'

import { useRouter } from 'next/navigation'

export default function EmployeeDashboard() {
  const router = useRouter()

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
      description: 'تجديد اشتراك زبون موجود',
      icon: '🔄',
      color: '#2d6a4f',
      href: '/employee/purchase?type=renewal',
      disabled: true,
      note: 'متاح للإداري فقط',
    },
    {
      title: 'صيانة',
      description: 'تسجيل طلب صيانة جهاز',
      icon: '🔧',
      color: '#7b3f00',
      href: '/employee/maintenance',
    },
  ]

  return (
    <div>
      {/* ترحيب */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#1a3a5c' }}>مرحباً بك في نظام الأماني 👋</h1>
        <p className="text-gray-500 mt-1">اختر الخدمة التي تريد تقديمها للزبون</p>
      </div>

      {/* بطاقات الخدمات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map(service => (
          <div
            key={service.title}
            onClick={() => !service.disabled && router.push(service.href)}
            className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ cursor: service.disabled ? 'not-allowed' : 'pointer', opacity: service.disabled ? 0.6 : 1 }}
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
              {service.note && (
                <p className="text-xs text-red-400 mt-2 font-medium">🔒 {service.note}</p>
              )}
            </div>
            {!service.disabled && (
              <div className="px-6 pb-5">
                <div
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold text-center transition-opacity"
                  style={{ background: service.color }}
                >
                  ابدأ الآن ←
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* إشعار */}
      <div className="mt-8 p-4 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 text-sm">
        💡 ملاحظة: تجديد الاشتراكات ومراقبة البيانات متاحة للموظف الإداري فقط
      </div>
    </div>
  )
}
