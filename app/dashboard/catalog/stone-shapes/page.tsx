import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCatalogMasterList } from '@/lib/catalog-master-save'
import { StoneShapesClient, type StoneShape } from './stone-shapes-client'

async function getStoneShapes(): Promise<StoneShape[]> {
  const adminClient = createSupabaseAdminClient()
  const data = await loadCatalogMasterList(adminClient, 'stone_shape')
  return data.map((item: any) => ({
    id: item.id,
    _revision: item._revision,
    name: item.name,
    slug: item.slug,
    svgName: item.svg_asset_url,
    displayOrder: item.display_order,
    status: item.status === 'hidden' ? 'Hidden' : 'Active',
  }))
}

export default async function StoneShapesPage() {
  const initialShapes = await getStoneShapes()
  return <StoneShapesClient initialShapes={initialShapes} />
}
