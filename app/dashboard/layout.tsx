import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { AdminGate } from '@/components/admin-gate'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGate>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden bg-background">
          <Topbar />
          <main className="flex-1 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </AdminGate>
  )
}
