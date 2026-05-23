'use client'

import { useEffect, useState } from 'react'
import { getSubscriptionPrices, saveSubscriptionPrices } from '@/lib/firebase/firestore'

export default function SettingsPage() {
  const [prices, setPrices] = useState({ '3_months': 0, '6_months': 0, yearly: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSubscriptionPrices().then(p => { setPrices(p); setLoading(false) })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await saveSubscriptionPrices(prices)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="text-center text-gray-400 py-20">جارٍ التحميل...</div>

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a3a5c' }}>إعدادات النظام ⚙️</h1>

      <div className="card">
        <h2 className="text-lg font-bold mb-5" style={{ color: '#1a3a5c' }}>أسعار الاشتراكات</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {[
            ['3_months', '3 أشهر (ربع سنوي)'],
            ['6_months', '6 أشهر (نصف سنوي)'],
            ['yearly', 'سنوي (12 شهر)'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input-field flex-1"
                  value={prices[key as keyof typeof prices]}
                  onChange={e => setPrices(p => ({ ...p, [key]: Number(e.target.value) }))}
                  min={0}
                  step={1000}
                  placeholder="0"
                />
                <span className="text-gray-500 text-sm whitespace-nowrap">دينار عراقي</span>
              </div>
            </div>
          ))}

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm text-center">
              ✅ تم حفظ الأسعار بنجاح
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'جارٍ الحفظ...' : '💾 حفظ الأسعار'}
          </button>
        </form>
      </div>
    </div>
  )
}
