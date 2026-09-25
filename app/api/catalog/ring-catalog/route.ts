import { assertAdmin } from '@/lib/cms-auth'
import { getCatalogRing, saveCatalogRing } from '@/lib/catalog-ring-save'

export async function GET(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return getCatalogRing(access) }
export async function PUT(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return saveCatalogRing(access, await request.json().catch(() => null)) }
