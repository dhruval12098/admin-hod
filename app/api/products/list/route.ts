import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assertAdmin } from '@/lib/cms-auth'
import { getProductRows, type ProductLane } from '@/app/dashboard/products/product-list'

function isProductLane(value: string | null): value is ProductLane {
  return value === 'standard' || value === 'hiphop' || value === 'collection'
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const searchParams = new URL(request.url).searchParams
  const lane = searchParams.get('lane')
  if (!isProductLane(lane)) {
    return NextResponse.json({ error: 'Invalid product lane.' }, { status: 400 })
  }
  const parsedPage = z.coerce.number().int().min(1).max(100_000).safeParse(searchParams.get('page') ?? '1')
  if (!parsedPage.success) return NextResponse.json({ error: 'Invalid page number.' }, { status: 400 })

  try {
    return NextResponse.json(await getProductRows(lane, parsedPage.data), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load products.' },
      { status: 503 }
    )
  }
}
