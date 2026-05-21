import AuthGuard from '@/components/layout/AuthGuard'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole="employee">{children}</AuthGuard>
}
