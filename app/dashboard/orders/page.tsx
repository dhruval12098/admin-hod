import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { OrdersClient, type OrdersResponse } from './orders-client'

const PAGE_SIZE = 20

async function getOrdersPage(page: number): Promise<OrdersResponse> {
  const adminClient = createSupabaseAdminClient()
  const safePage = Math.max(1, page)
  const from = (safePage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [ordersResult, countResult] = await Promise.all([
    adminClient
      .from('orders')
      .select('id, order_number, customer_first_name, customer_last_name, customer_email, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .range(from, to),
    adminClient.from('orders').select('id', { count: 'exact', head: true }),
  ])

  if (ordersResult.error) {
    throw new Error(ordersResult.error.message)
  }

  const ids = (ordersResult.data ?? []).map((order: any) => order.id)
  const itemsResult = ids.length
    ? await adminClient.from('order_items').select('order_id').in('order_id', ids)
    : { data: [], error: null }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message)
  }

  const itemCountMap = new Map<string, number>()
  for (const row of itemsResult.data ?? []) {
    itemCountMap.set(row.order_id, (itemCountMap.get(row.order_id) ?? 0) + 1)
  }

  return {
    items: (ordersResult.data ?? []).map((order: any) => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ') || order.customer_email,
      customerEmail: order.customer_email,
      total: Number(order.total_amount || 0),
      status: order.status,
      createdAt: order.created_at,
      items: itemCountMap.get(order.id) ?? 0,
    })),
    page: safePage,
    pageSize: PAGE_SIZE,
    total: countResult.count ?? 0,
    totalPages: Math.max(1, Math.ceil((countResult.count ?? 0) / PAGE_SIZE)),
  }
}

export default async function OrdersPage() {
  const initialData = await getOrdersPage(1)
  return <OrdersClient initialData={initialData} />
}
