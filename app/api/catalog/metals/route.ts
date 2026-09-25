import { assertAdmin } from '@/lib/cms-auth'
import { listCatalogMetals,saveCatalogMetal } from '@/lib/catalog-metal-save'
export async function GET(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;return listCatalogMetals(access)}
export async function POST(request:Request){const access=await assertAdmin(request);if('error'in access)return access.error;return saveCatalogMetal(access,null,await request.json().catch(()=>null))}
