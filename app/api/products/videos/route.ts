import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { getCentralVideoLibrary } from '@/lib/r2'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('refresh') === '1'

  try {
    const items = await getCentralVideoLibrary({ forceRefresh })
    return NextResponse.json({ items }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load the Cloudflare video library.' },
      { status: 500 },
    )
  }
}
