'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Download, Eye, Filter, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type OrderRow = {
  id: string
  orderNumber: string
  customer: string
  customerEmail: string
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  items: number
}

type OrdersResponse = {
  items: OrderRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken()
  const headers = new Headers(options.headers)
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)
  return fetch(url, { ...options, headers })
}

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderRow['status']>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    void loadOrders(page)
  }, [page])

  const loadOrders = async (nextPage: number) => {
    setLoading(true)
    try {
      const response = await authedFetch(`/api/orders?page=${nextPage}`)
      const payload = (await response.json().catch(() => null)) as OrdersResponse | null
      if (response.ok && payload) {
        setOrders(payload.items)
        setTotalPages(payload.totalPages)
      } else {
        setOrders([])
        setTotalPages(1)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.toLowerCase().includes(search.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: OrderRow['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700'
      case 'shipped':
        return 'bg-blue-100 text-blue-700'
      case 'processing':
        return 'bg-yellow-100 text-yellow-700'
      case 'pending':
        return 'bg-gray-100 text-gray-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage real customer orders from checkout.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors duration-200">
          <Download size={18} />
          Export
        </button>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative min-w-64 flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">Loading orders...</td>
                </tr>
              ) : filteredOrders.length ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{order.orderNumber}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <div>{order.customer}</div>
                      <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{order.items}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">${order.total.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/orders/${order.id}`} className="inline-flex rounded p-1.5 hover:bg-secondary transition-colors" title="View Details">
                        <Eye size={16} className="text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Showing up to 20 orders per page</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
