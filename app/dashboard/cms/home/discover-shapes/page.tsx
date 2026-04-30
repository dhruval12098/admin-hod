import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { DiscoverItemsEditorClient, type DiscoverItemsInitialData } from '@/components/discover-items-editor-client'

async function getInitialData(): Promise<{
  items: DiscoverItemsInitialData['items']
  shapes: Array<{ id: string; name: string; slug: string }>
}> {
  const adminClient = createSupabaseAdminClient()
  const [{ data, error }, { data: shapes, error: shapesError }] = await Promise.all([
    adminClient
      .from('discover_shapes_items')
      .select('*')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('catalog_stone_shapes')
      .select('id, name, slug')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
  ])

  if (error) {
    throw new Error(error.message)
  }
  if (shapesError) {
    throw new Error(shapesError.message)
  }

  return {
    items: (data ?? []).map((item) => ({
      sort_order: item.sort_order,
      title: item.title,
      description: item.description,
      image_path: item.image_path,
      image_alt: item.image_alt,
      shape_id: item.shape_id ?? '',
    })),
    shapes: shapes ?? [],
  }
}

export default async function DiscoverShapesEditorPage() {
  const initialData = await getInitialData()

  return (
    <DiscoverItemsEditorClient
      backHref="/dashboard/cms/home"
      sectionName="Discover Shapes"
      sectionDescription="Manage the carousel items for the Discover Shapes section. Section heading and intro stay static. Each item links from the selected stone shape master."
      saveEndpoint="/api/cms/home/discover-shapes"
      uploadEndpoint="/api/cms/uploads/discover-shapes"
      saveDescription="This will update the Discover Shapes carousel on the homepage."
      initialData={{ items: initialData.items }}
      shapeOptions={initialData.shapes}
      shapeFieldLabel="Linked Shape"
    />
  )
}
