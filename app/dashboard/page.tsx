import { TrendingUp, Package, Users, ShoppingCart } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    { label: 'Total Products', value: '1,240', icon: Package, change: '+12%' },
    { label: 'Total Orders', value: '3,521', icon: ShoppingCart, change: '+8%' },
    { label: 'Customers', value: '2,804', icon: Users, change: '+21%' },
    { label: 'Revenue', value: '$45,231', icon: TrendingUp, change: '+15%' },
  ]

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to House of Diams</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-white p-6 shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="mt-4 font-jakarta text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-2.5 text-xs text-green-600 font-semibold">{stat.change} from last month</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 ml-3">
                  <Icon size={22} className="text-foreground" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-white p-8 shadow-xs">
          <h2 className="font-jakarta text-lg font-semibold text-foreground mb-6">Recent Orders</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Orders data will appear here
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border border-border bg-white p-8 shadow-xs">
          <h2 className="font-jakarta text-lg font-semibold text-foreground mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors duration-200">
              Add Product
            </button>
            <button className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors duration-200">
              View Inventory
            </button>
            <button className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors duration-200">
              Create Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
