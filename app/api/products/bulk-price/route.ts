import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const OPERATIONS = new Set(['increase_amount', 'decrease_amount', 'increase_percent', 'decrease_percent'])
const LANES = new Set(['standard', 'hiphop', 'collection'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_PRODUCTS = 500

function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100 }

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  const ids: string[] = []
  if (Array.isArray(body?.ids)) {
    for (const candidate of body.ids as unknown[]) {
      if (typeof candidate === 'string' && !ids.includes(candidate)) ids.push(candidate)
    }
  }
  const operation = typeof body?.operation === 'string' ? body.operation : ''
  const lane = typeof body?.lane === 'string' ? body.lane : ''
  const value = Number(body?.value)
  const expectedPrices = Array.isArray(body?.expectedPrices) ? body.expectedPrices : []

  if (body?.confirmation !== 'ADJUST_BASE_PRICES') return NextResponse.json({ error: 'Explicit confirmation is required.' }, { status: 400 })
  if (!ids.length || ids.length > MAX_PRODUCTS || ids.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id))) return NextResponse.json({ error: `Select between 1 and ${MAX_PRODUCTS} valid products.` }, { status: 400 })
  if (!OPERATIONS.has(operation) || !LANES.has(lane)) return NextResponse.json({ error: 'Invalid bulk price operation.' }, { status: 400 })
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) return NextResponse.json({ error: 'Enter a valid adjustment greater than zero.' }, { status: 400 })
  if (operation.endsWith('_percent') && value > 1000) return NextResponse.json({ error: 'Percentage adjustments cannot exceed 1000%.' }, { status: 400 })
  if (operation === 'decrease_percent' && value >= 100) return NextResponse.json({ error: 'Percentage decreases must be less than 100%.' }, { status: 400 })

  const expected = new Map<string, number>()
  for (const entry of expectedPrices) {
    if (!entry || typeof entry.id !== 'string' || !UUID_PATTERN.test(entry.id) || !Number.isFinite(Number(entry.price))) continue
    expected.set(entry.id, roundMoney(Number(entry.price)))
  }
  if (expected.size !== ids.length || ids.some((id) => !expected.has(id))) return NextResponse.json({ error: 'Price verification data is incomplete. Refresh and try again.' }, { status: 400 })

  const { data, error } = await access.adminClient.from('products').select('id, base_price, product_lane').in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length !== ids.length || data.some((row) => row.product_lane !== lane)) return NextResponse.json({ error: 'One or more selected products are unavailable or outside this product list.' }, { status: 409 })

  const updates = data.map((row) => {
    const currentPrice = Number(row.base_price)
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return { error: 'Every selected product must have a valid base price.' } as const
    if (roundMoney(currentPrice) !== expected.get(row.id)) return { error: 'A selected product price changed after selection. Refresh the list and try again.' } as const
    const delta = operation.endsWith('_percent') ? currentPrice * (value / 100) : value
    const nextPrice = roundMoney(operation.startsWith('increase_') ? currentPrice + delta : currentPrice - delta)
    if (!Number.isFinite(nextPrice) || nextPrice <= 0 || nextPrice > 1_000_000_000) return { error: 'The adjustment would create an invalid product price.' } as const
    return { id: row.id, oldPrice: roundMoney(currentPrice), newPrice: nextPrice } as const
  })
  const invalid = updates.find((entry) => 'error' in entry)
  if (invalid && 'error' in invalid) return NextResponse.json({ error: invalid.error }, { status: 400 })

  const completed: Array<{ id: string; oldPrice: number; newPrice: number }> = []
  for (const item of updates as Array<{ id: string; oldPrice: number; newPrice: number }>) {
    const { data: updated, error: updateError } = await access.adminClient.from('products').update({ base_price: item.newPrice, updated_at: new Date().toISOString() }).eq('id', item.id).eq('base_price', item.oldPrice).select('id').maybeSingle()
    if (updateError || !updated) {
      const rollbackResults = await Promise.all(completed.map((done) => access.adminClient.from('products').update({ base_price: done.oldPrice }).eq('id', done.id).eq('base_price', done.newPrice)))
      const rollbackFailed = rollbackResults.some((result) => Boolean(result.error))
      return NextResponse.json(
        {
          error: rollbackFailed
            ? 'The update stopped and automatic restoration could not be fully verified. Refresh the product list and review the selected prices before trying again.'
            : 'No prices were applied because a selected product changed during the update. Refresh and try again.',
        },
        { status: rollbackFailed ? 500 : 409 },
      )
    }
    completed.push(item)
  }

  return NextResponse.json({ ok: true, updatedCount: completed.length, items: completed.map(({ id, newPrice }) => ({ id, price: newPrice })) })
}