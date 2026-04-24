'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type OrderDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

type OrderDetail = {
  id: string
  order_number: string
  customer_email: string
  customer_first_name: string
  customer_last_name: string | null
  customer_phone: string | null
  shipping_country: string | null
  shipping_state: string | null
  shipping_city: string | null
  shipping_postal_code: string | null
  shipping_address_line_1: string | null
  shipping_address_line_2: string | null
  total_amount: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: string
  created_at: string
  notes: string | null
}

type OrderItem = {
  id: string
  product_name: string
  product_slug: string | null
  sku: string | null
  quantity: number
  unit_price: number
  line_total: number
  selected_metal: string | null
  selected_purity: string | null
  selected_size_or_fit: string | null
  selected_gemstone: string | null
  selected_carat: string | null
  image_url: string | null
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken()
  const headers = new Headers(options.headers)
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)
  if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json')
  return fetch(url, { ...options, headers })
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [status, setStatus] = useState<OrderDetail['status']>('pending')

  useEffect(() => {
    void params.then((resolved) => setId(resolved.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    void loadOrder(id)
  }, [id])

  const loadOrder = async (orderId: string) => {
    setLoading(true)
    try {
      const response = await authedFetch(`/api/orders/${orderId}`)
      const payload = await response.json().catch(() => null)
      if (response.ok && payload) {
        setOrder(payload.order)
        setItems(payload.items ?? [])
        setStatus(payload.order.status)
      }
    } finally {
      setLoading(false)
    }
  }

  const saveStatus = async () => {
    if (!order) return
    setSavingStatus(true)
    try {
      const response = await authedFetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (response.ok) {
        await loadOrder(order.id)
      }
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) {
    return <div className="p-8"><div className="rounded-lg border border-border bg-white px-6 py-12 text-sm text-muted-foreground">Loading order...</div></div>
  }

  if (!order) {
    return <div className="p-8"><div className="rounded-lg border border-border bg-white px-6 py-12 text-sm text-muted-foreground">Order not found.</div></div>
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/orders" className="text-sm font-semibold text-primary hover:text-primary/80">Back to Orders</Link>
          <h1 className="mt-3 font-jakarta text-3xl font-semibold text-foreground">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderDetail['status'])}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={() => void saveStatus()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60" disabled={savingStatus}>
            {savingStatus ? 'Saving...' : 'Update Status'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-white shadow-xs overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-jakarta text-lg font-semibold text-foreground">Order Items</h2>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 px-6 py-5">
                  <div className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-secondary/30">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{item.product_name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">Slug: {item.product_slug || '-'}</div>
                    <div className="mt-1 text-sm text-muted-foreground">SKU: {item.sku || '-'}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.selected_metal ? <span>Metal: {item.selected_metal}</span> : null}
                      {item.selected_purity ? <span>Purity: {item.selected_purity}</span> : null}
                      {item.selected_gemstone ? <span>Stone: {item.selected_gemstone}</span> : null}
                      {item.selected_carat ? <span>Carat: {item.selected_carat}</span> : null}
                      {item.selected_size_or_fit ? <span>Size/Fit: {item.selected_size_or_fit}</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Qty {item.quantity}</div>
                    <div className="mt-1 font-semibold text-foreground">${Number(item.line_total || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-white p-6 shadow-xs">
            <h2 className="font-jakarta text-lg font-semibold text-foreground">Customer</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div><span className="font-semibold text-foreground">Name:</span> {[order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ')}</div>
              <div><span className="font-semibold text-foreground">Email:</span> {order.customer_email}</div>
              <div><span className="font-semibold text-foreground">Phone:</span> {order.customer_phone || '-'}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-6 shadow-xs">
            <h2 className="font-jakarta text-lg font-semibold text-foreground">Shipping</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div>{order.shipping_address_line_1 || '-'}</div>
              <div>{order.shipping_address_line_2 || ''}</div>
              <div>{[order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(', ') || '-'}</div>
              <div>{order.shipping_country || '-'}</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-6 shadow-xs">
            <h2 className="font-jakarta text-lg font-semibold text-foreground">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div><span className="font-semibold text-foreground">Status:</span> {order.status}</div>
              <div><span className="font-semibold text-foreground">Payment:</span> {order.payment_status}</div>
              <div><span className="font-semibold text-foreground">Total:</span> ${Number(order.total_amount || 0).toLocaleString()}</div>
              <div><span className="font-semibold text-foreground">Notes:</span> {order.notes || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
