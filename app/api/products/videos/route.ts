import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { getCentralVideoLibrary } from '@/lib/r2'
import { videoLibraryQuerySchema } from '@/lib/product-operations-validation'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const query = videoLibraryQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()))
  if (!query.success) return NextResponse.json({ error: 'Invalid video library request.' }, { status: 400 })
  const forceRefresh = query.data.refresh === '1'

  try {
    const items = await getCentralVideoLibrary({ forceRefresh })
    return NextResponse.json({ items }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Unable to load the product video library.' }, { status: 500 })
  }
}
