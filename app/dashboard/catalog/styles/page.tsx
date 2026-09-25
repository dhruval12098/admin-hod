import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCatalogMasterList } from '@/lib/catalog-master-save'
import { StylesClient, type CatalogStyleItem } from './styles-client'

async function getStyles(): Promise<CatalogStyleItem[]> {
  const adminClient = createSupabaseAdminClient()
  const data = await loadCatalogMasterList(adminClient, 'style')
  return data.map((item: any) => ({
    id: item.id,
    _revision: item._revision,
    name: item.name,
    iconSvgPath: item.icon_svg_path ?? '',
    displayOrder: item.display_order,
    status: item.status === 'hidden' ? 'Hidden' : 'Active',
  }))
}

export default async function StylesPage() {
  const initialItems = await getStyles()
  return <StylesClient initialItems={initialItems} />
}
