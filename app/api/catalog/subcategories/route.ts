import { assertAdmin } from '@/lib/cms-auth'
import { saveCatalogHierarchy } from '@/lib/catalog-hierarchy-save'

export async function POST(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return saveCatalogHierarchy(access, 'subcategory', null, await request.json().catch(() => null)) }
