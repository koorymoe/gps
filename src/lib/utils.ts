import { SubscriptionType, SubscriptionStatus } from '@/types'

export function getSubscriptionDays(type: SubscriptionType): number {
  switch (type) {
    case '3_months': return 90
    case '6_months': return 180
    case 'yearly': return 365
  }
}

export function getSubscriptionLabel(type: SubscriptionType): string {
  switch (type) {
    case '3_months': return '3 أشهر'
    case '6_months': return '6 أشهر'
    case 'yearly': return 'سنوي'
  }
}

export function getSubscriptionStatus(endDate: string): SubscriptionStatus {
  const now = new Date()
  const end = new Date(endDate)
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays > 30) return 'active'
  if (diffDays > 0) return 'expiring_soon'
  if (diffDays > -40) return 'expired_40'
  if (diffDays > -80) return 'expired_80'
  return 'terminated'
}

export function getStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'active': return 'نشط'
    case 'expiring_soon': return 'قارب على الانتهاء'
    case 'expired_40': return 'منتهي - تذكير أول'
    case 'expired_80': return 'منتهي - تذكير ثاني'
    case 'terminated': return 'محتجز'
  }
}

export function getStatusColor(status: SubscriptionStatus): string {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-50'
    case 'expiring_soon': return 'text-yellow-600 bg-yellow-50'
    case 'expired_40': return 'text-orange-600 bg-orange-50'
    case 'expired_80': return 'text-red-600 bg-red-50'
    case 'terminated': return 'text-gray-600 bg-gray-100'
  }
}

export function getRemainingDays(endDate: string): number {
  const now = new Date()
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
