import Link from 'next/link'
import { TrendingUp, Package, Users, ShoppingCart, ArrowRight } from 'lucide-react'
import { formatUsd } from '@/lib/money'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { getAdminCustomerUsers } from '@/lib/admin-users'

type DashboardStat = {
  label: string
  value: string
  icon: typeof Package
  note: string
}

type RecentOrder = {
  id: string
  orderNumber: string
  customer: string
  total: number
  status: string
  createdAt: string
}

type TopSeller = {
  name: string
  unitsSold: number
  revenue: number
}

type SalesBarPoint = {
  label: string
  revenue: number
  orders: number
}

function formatCurrency(value: number) {
  return formatUsd(value)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Pending'
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function getDashboardData() {
  const supabase = createSupabaseAdminClient()

  const [
    productsCount,
    ordersCount,
    revenueResult,
    recentOrdersResult,
    orderItemsResult,
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total_amount, status'),
    supabase
      .from('orders')
      .select('id, order_number, customer_first_name, customer_last_name, customer_email, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('order_items').select('product_name, quantity, line_total'),
  ])

  const customers = await getAdminCustomerUsers()

  const revenueRows = revenueResult.data ?? []
  const paidStatuses = new Set(['paid', 'confirmed', 'processing', 'shipped', 'delivered'])
  const totalRevenue = revenueRows.reduce((sum, row: any) => {
    const status = String(row.status ?? '').toLowerCase()
    if (paidStatuses.size > 0 && status && !paidStatuses.has(status)) return sum
    return sum + Number(row.total_amount ?? 0)
  }, 0)

  const recentOrders: RecentOrder[] = (recentOrdersResult.data ?? []).map((order: any) => ({
    id: order.id,
    orderNumber: order.order_number || 'Order',
    customer:
      [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ') ||
      order.customer_email ||
      'Customer',
    total: Number(order.total_amount ?? 0),
    status: formatStatus(order.status),
    createdAt: order.created_at,
  }))

  const salesMap = new Map<string, TopSeller>()
  for (const item of orderItemsResult.data ?? []) {
    const name = item.product_name || 'Untitled Product'
    const existing = salesMap.get(name) ?? {
      name,
      unitsSold: 0,
      revenue: 0,
    }

    existing.unitsSold += Number(item.quantity ?? 0)
    existing.revenue += Number(item.line_total ?? 0)
    salesMap.set(name, existing)
  }

  const topSellers = Array.from(salesMap.values())
    .sort((a, b) => {
      if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold
      return b.revenue - a.revenue
    })
    .slice(0, 3)

  const monthlyMap = new Map<string, SalesBarPoint>()
  for (const order of recentOrdersResult.data ?? []) {
    const date = new Date(order.created_at)
    if (Number.isNaN(date.getTime())) continue
    const label = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date)
    const current = monthlyMap.get(label) ?? { label, revenue: 0, orders: 0 }
    current.revenue += Number(order.total_amount ?? 0)
    current.orders += 1
    monthlyMap.set(label, current)
  }
  const salesBars = Array.from(monthlyMap.values())
  const maxRevenue = Math.max(...salesBars.map((item) => item.revenue), 1)

  const stats: DashboardStat[] = [
    {
      label: 'Total Products',
      value: String(productsCount.count ?? 0),
      icon: Package,
      note: 'Live product count',
    },
    {
      label: 'Total Orders',
      value: String(ordersCount.count ?? 0),
      icon: ShoppingCart,
      note: 'Real checkout orders',
    },
    {
      label: 'Customers',
      value: String(customers.length),
      icon: Users,
      note: 'Signed-up auth users',
    },
    {
      label: 'Revenue',
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      note: 'Based on paid/fulfilled orders',
    },
  ]

  return { stats, recentOrders, topSellers, salesBars, maxRevenue }
}

export default async function DashboardPage() {
  const { stats, recentOrders, topSellers, salesBars, maxRevenue } = await getDashboardData()

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live overview of your store activity and best-performing products.</p>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="mt-4 font-jakarta text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-2.5 text-xs font-semibold text-muted-foreground">{stat.note}</p>
                </div>
                <div className="ml-3 rounded-lg bg-secondary p-3">
                  <Icon size={22} className="text-foreground" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-8 shadow-xs lg:col-span-2">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-jakarta text-lg font-semibold text-foreground">Recent Orders</h2>
              <p className="mt-1 text-sm text-muted-foreground">Latest real orders placed through checkout.</p>
            </div>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
            >
              View all
              <ArrowRight size={16} />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-4 text-sm font-semibold text-foreground">{order.orderNumber}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{order.customer}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{order.status}</td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-foreground">{formatCurrency(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No real orders found yet.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-white p-8 shadow-xs">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-jakarta text-lg font-semibold text-foreground">Top Selling Products</h2>
              <p className="mt-1 text-sm text-muted-foreground">Showing the current top 3 based on units sold.</p>
            </div>
            <Link
              href="/dashboard/products"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
            >
              View more
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {topSellers.length > 0 ? (
              topSellers.map((product, index) => (
                <div key={product.name} className="rounded-xl border border-border bg-secondary/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        #{index + 1}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-foreground">{product.name}</h3>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs">
                      {product.unitsSold} sold
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Revenue: {formatCurrency(product.revenue)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-secondary/10 px-4 py-10 text-center text-sm text-muted-foreground">
                No top-selling products yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-white p-8 shadow-xs">
        <div className="mb-6">
          <h2 className="font-jakarta text-lg font-semibold text-foreground">Revenue Snapshot</h2>
          <p className="mt-1 text-sm text-muted-foreground">Simple month-wise bar view from recent order totals.</p>
        </div>

        {salesBars.length > 0 ? (
          <div className="flex items-end gap-4 overflow-x-auto pt-4">
            {salesBars.map((point) => (
              <div key={point.label} className="flex min-w-24 flex-col items-center gap-3">
                <div className="flex h-48 w-full items-end rounded-md bg-secondary/30 px-3 py-3">
                  <div
                    className="w-full rounded-sm bg-primary transition-all"
                    style={{ height: `${Math.max(10, (point.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-foreground">{point.label}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(point.revenue)}</div>
                  <div className="text-[11px] text-muted-foreground">{point.orders} orders</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Not enough order data for the chart yet.
          </div>
        )}
      </div>
    </div>
  )
}
