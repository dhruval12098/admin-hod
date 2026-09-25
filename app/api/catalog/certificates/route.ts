import { assertAdmin } from '@/lib/cms-auth'
import { listCatalogMasters, saveCatalogMaster } from '@/lib/catalog-master-save'

export async function GET(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return listCatalogMasters(access, 'certificate') }
export async function POST(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return saveCatalogMaster(access, 'certificate', null, await request.json().catch(() => null)) }
