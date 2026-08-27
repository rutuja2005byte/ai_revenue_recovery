import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import AlertsDropdown from '@/components/AlertsDropdown'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-4 flex justify-between items-center">
        <span className="font-semibold">Revenue Recovery</span>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-recovery: ON
          </span>
          <span className="text-sm text-gray-500">{user.email}</span>
          <AlertsDropdown />
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  )
}