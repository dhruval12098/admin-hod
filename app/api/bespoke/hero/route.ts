import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadBespokeHeroSnapshot, saveBespokeHero } from '@/lib/bespoke-hero-save'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  try {
    const snapshot = await loadBespokeHeroSnapshot(access.adminClient)
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load the Bespoke Hero.' }, { status: 503 })
  }
}

export async function PUT(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return saveBespokeHero(access, await request.json().catch(() => null))
}
