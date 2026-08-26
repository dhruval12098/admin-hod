import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { getAdminServerSession } from '@/lib/admin-server'
import { getAdminCustomerUsers } from '@/lib/admin-users'
import { getNotificationCount } from '@/lib/notifications'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminServerSession()

  if (!admin) {
    redirect('/login')
  }

  const [customers, notificationCount] = await Promise.all([
    getAdminCustomerUsers(),
    getNotificationCount(admin.userId),
  ])

  return (
    <div className="flex h-screen bg-secondary/50">
      <Sidebar customerCount={customers.length} />
      <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
        <Topbar notificationCount={notificationCount} />
        <main className="flex-1 overflow-auto rounded-tl-2xl bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}
