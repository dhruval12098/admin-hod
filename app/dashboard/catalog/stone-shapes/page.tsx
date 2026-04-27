import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { StoneShapesClient, type StoneShape } from './stone-shapes-client'

async function getStoneShapes(): Promise<StoneShape[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('catalog_stone_shapes')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,
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
