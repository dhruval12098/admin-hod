import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { StylesClient, type CatalogStyleItem } from './styles-client'

async function getStyles(): Promise<CatalogStyleItem[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('catalog_styles')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,
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
