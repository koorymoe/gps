import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/employee')

  return (
    <div className="flex">
      <Sidebar role="admin" userName={profile.full_name} />
      <main className="flex-1 p-8 min-h-screen" style={{ background: '#f0f4f8' }}>
        {children}
      </main>
    </div>
  )
}
