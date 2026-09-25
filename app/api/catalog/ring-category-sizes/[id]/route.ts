import { assertAdmin } from '@/lib/cms-auth'
import { saveCatalogRing } from '@/lib/catalog-ring-save'

export async function PATCH(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return saveCatalogRing(access, await request.json().catch(() => null)) }
export async function DELETE(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return saveCatalogRing(access, await request.json().catch(() => null)) }
