import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type InventoryPayload = {
  stock_quantity: number
  notes?: string | null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = (await request.json().catch(() => null)) as InventoryPayload | null
  if (!body || Number.isNaN(Number(body.stock_quantity))) {
    return NextResponse.json({ error: 'Invalid stock quantity.' }, { status: 400 })
  }

  const nextStock = Math.max(0, Number(body.stock_quantity))
  const { data: existing, error: existingError } = await access.adminClient
    .from('products')
    .select('stock_quantity')
    .eq('id', id)
    .single()

  if (existingError || !existing) {
    return NextResponse.json({ error: existingError?.message || 'Product not found.' }, { status: 404 })
  }

  const previousStock = Number(existing.stock_quantity ?? 0)
  const { error: updateError } = await access.adminClient
    .from('products')
    .update({ stock_quantity: nextStock })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: adjustmentError } = await access.adminClient.from('inventory_adjustments').insert({
    product_id: id,
    adjustment_type: 'manual_set',
    quantity_change: nextStock - previousStock,
    previous_stock: previousStock,
    new_stock: nextStock,
    notes: body.notes || 'Stock updated from inventory admin.',
  })

  return NextResponse.json({
    ok: true,
    stockQuantity: nextStock,
    warning: adjustmentError?.message ?? null,
  })
}
