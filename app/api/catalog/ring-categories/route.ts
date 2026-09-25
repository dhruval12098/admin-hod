import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCatalogRingSnapshot, saveCatalogRing } from '@/lib/catalog-ring-save'

export async function GET(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; const snapshot = await loadCatalogRingSnapshot(access.adminClient); return NextResponse.json({ items: snapshot.categories, revision: snapshot.revision }, { headers: { 'Cache-Control': 'no-store' } }) }
export async function POST(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return saveCatalogRing(access, await request.json().catch(() => null)) }
