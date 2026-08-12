import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type DuplicateProductResult = {
  product_id: string
  slug: string
  lane: 'standard' | 'hiphop' | 'collection'
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null) as { requestId?: unknown } | null
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : ''

  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(requestId)) {
    return NextResponse.json({ error: 'A valid product and duplication request are required.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient.rpc('duplicate_product', {
    p_source_product_id: id,
    p_request_id: requestId,
    p_admin_id: access.user.id,
  })

  if (error) {
    const missingFunction = error.code === 'PGRST202' || error.message.includes('duplicate_product') && error.message.includes('schema cache')
    return NextResponse.json(
      {
        error: missingFunction
          ? 'Product duplication is not installed in the database yet.'
          : error.message || 'Unable to duplicate this product.',
      },
      { status: missingFunction ? 503 : 500 }
    )
  }

  const item = (Array.isArray(data) ? data[0] : data) as DuplicateProductResult | null
  if (!item?.product_id || !item.slug) {
    return NextResponse.json({ error: 'The database did not return the duplicated product.' }, { status: 500 })
  }

  return NextResponse.json({ item })
}
