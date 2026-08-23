import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { getProductRows, type ProductLane } from '@/app/dashboard/products/product-list'

function isProductLane(value: string | null): value is ProductLane {
  return value === 'standard' || value === 'hiphop' || value === 'collection'
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const lane = new URL(request.url).searchParams.get('lane')
  if (!isProductLane(lane)) {
    return NextResponse.json({ error: 'Invalid product lane.' }, { status: 400 })
  }

  try {
    const items = await getProductRows(lane)
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load products.' },
      { status: 500 }
    )
  }
}
