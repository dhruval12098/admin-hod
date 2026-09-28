import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCmsSingletonSnapshot, saveCmsSingleton } from '@/lib/cms-singleton-save'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  try {
    return NextResponse.json(await loadCmsSingletonSnapshot(access.adminClient, 'collection_page'), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load the Collection settings.' }, { status: 503 })
  }
}
export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return saveCmsSingleton(access, 'collection_page', await request.json().catch(() => null))
}
