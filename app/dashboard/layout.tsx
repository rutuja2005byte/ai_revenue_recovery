import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import AlertsDropdown from '@/components/AlertsDropdown'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-5 flex justify-between items-center">
        <Link href="/dashboard" className="font-semibold text-xl text-gray-900 hover:text-gray-700">
          Revenue Recovery
        </Link>
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Auto-recovery: ON
          </span>
          <span className="text-base text-gray-500">{user.email}</span>
          <AlertsDropdown />
          <Link
            href="/settings"
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  )
}