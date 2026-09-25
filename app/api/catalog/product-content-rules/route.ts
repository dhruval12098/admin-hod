import { assertAdmin } from '@/lib/cms-auth'
import { listCatalogMasters, saveCatalogMaster } from '@/lib/catalog-master-save'

export async function GET(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return listCatalogMasters(access, 'content_rule') }
export async function POST(request: Request) { const access = await assertAdmin(request); if ('error' in access) return access.error; return saveCatalogMaster(access, 'content_rule', null, await request.json().catch(() => null)) }
