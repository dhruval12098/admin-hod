import { unstable_noStore as noStore } from 'next/cache'
import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadNavbarBuilderData } from '@/lib/navbar-data'
import { saveNavbar } from '@/lib/navbar-save'

export async function GET(request: Request) {
  noStore()
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  try {
    const payload = await loadNavbarBuilderData(access.adminClient)
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the navbar editor.'
    return NextResponse.json({ error: message }, { status: message.includes('migration') ? 503 : 500 })
  }
}

export async function PUT(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return saveNavbar(access, await request.json().catch(() => null))
}
