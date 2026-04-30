import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { sendOrderStatusUpdateEmail } from '@/lib/email'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { id } = await context.params

  const [orderResult, itemsResult, loveLetterResult] = await Promise.all([
    adminClient.from('orders').select('*').eq('id', id).single(),
    adminClient.from('order_items').select('*').eq('order_id', id).order('created_at', { ascending: true }),
    adminClient.from('order_love_letters').select('*').eq('order_id', id).maybeSingle(),
  ])

  if (orderResult.error) {
    return NextResponse.json({ error: orderResult.error.message }, { status: 500 })
  }

  if (itemsResult.error) {
    return NextResponse.json({ error: itemsResult.error.message }, { status: 500 })
  }

  if (loveLetterResult.error) {
    return NextResponse.json({ error: loveLetterResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    order: orderResult.data,
    items: itemsResult.data ?? [],
    loveLetter: loveLetterResult.data ?? null,
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { id } = await context.params
  const payload = await request.json().catch(() => null)
  const status = payload?.status
  const courierName = typeof payload?.courier_name === 'string' ? payload.courier_name.trim() : null
  const courierAwbNumber = typeof payload?.courier_awb_number === 'string' ? payload.courier_awb_number.trim() : null

  if (!status) {
    return NextResponse.json({ error: 'Missing status.' }, { status: 400 })
  }

  if (status === 'shipped') {
    if (!courierName) {
      return NextResponse.json({ error: 'Courier name is required for shipped orders.' }, { status: 400 })
    }
    if (!courierAwbNumber) {
      return NextResponse.json({ error: 'AWB or tracking number is required for shipped orders.' }, { status: 400 })
    }
  }

  const [existingOrderResult, itemsResult] = await Promise.all([
    adminClient
      .from('orders')
      .select('id, order_number, customer_email, customer_first_name, customer_last_name, total_amount, created_at, status, courier_name, courier_awb_number, shipped_at')
      .eq('id', id)
      .single(),
    adminClient
      .from('order_items')
      .select('product_name, quantity, line_total')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (existingOrderResult.error) {
    return NextResponse.json({ error: existingOrderResult.error.message }, { status: 500 })
  }

  if (itemsResult.error) {
    return NextResponse.json({ error: itemsResult.error.message }, { status: 500 })
  }

  const { data, error } = await adminClient
    .from('orders')
    .update({
      status,
      courier_name: courierName,
      courier_awb_number: courierAwbNumber,
      shipped_at:
        status === 'shipped'
          ? existingOrderResult.data.shipped_at ?? new Date().toISOString()
          : existingOrderResult.data.shipped_at ?? null,
    })
    .eq('id', id)
    .select('id, status, order_number, customer_email, customer_first_name, customer_last_name, total_amount, created_at, courier_name, courier_awb_number, shipped_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (existingOrderResult.data.status !== status) {
    let emailStatus: 'sent' | 'failed' = 'sent'
    try {
      await sendOrderStatusUpdateEmail({
        customerEmail: data.customer_email || '',
        customerName: [data.customer_first_name, data.customer_last_name].filter(Boolean).join(' ') || 'Client',
        orderNumber: data.order_number,
        orderDate: data.created_at,
        totalAmount: Number(data.total_amount || 0),
        status,
        courierName: data.courier_name || null,
        courierAwbNumber: data.courier_awb_number || null,
        shippedAt: data.shipped_at || null,
        items: (itemsResult.data ?? []).map((item) => ({
          product_name: item.product_name,
          quantity: Number(item.quantity || 0),
          line_total: Number(item.line_total || 0),
        })),
      })
    } catch (emailError) {
      emailStatus = 'failed'
      console.error('Order status email failed:', emailError)
      return NextResponse.json({ item: data, emailStatus, emailError: emailError instanceof Error ? emailError.message : 'Email failed.' })
    }
    return NextResponse.json({ item: data, emailStatus })
  }

  return NextResponse.json({ item: data, emailStatus: 'unchanged' })
}
