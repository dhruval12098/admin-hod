import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { DiscoverItemsEditorClient, type DiscoverItemsInitialData } from '@/components/discover-items-editor-client'
import { loadHomeGroup1Snapshot } from '@/lib/cms-home-group1-save'

async function getInitialData(): Promise<{
  items: DiscoverItemsInitialData['items']
  shapes: Array<{ id: string; name: string; slug: string }>
  revision: string
}> {
  const adminClient = createSupabaseAdminClient()
  const [snapshot, { data: shapes, error: shapesError }] = await Promise.all([
    loadHomeGroup1Snapshot(adminClient, 'discover_shapes'),
    adminClient
      .from('catalog_stone_shapes')
      .select('id, name, slug')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
  ])

  if (shapesError) {
    throw new Error(shapesError.message)
  }

  return {
    items: snapshot.items.map((item) => ({
      id: String(item.id),
      sort_order: Number(item.sort_order),
      title: String(item.title ?? ''),
      description: String(item.description ?? ''),
      image_path: String(item.image_path ?? ''),
      image_alt: String(item.image_alt ?? ''),
      shape_id: String(item.shape_id ?? ''),
    })),
    shapes: shapes ?? [],
    revision: snapshot.revision,
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
      uploadSignEndpoint="/api/cms/uploads/discover-shapes/sign"
      saveDescription="This will update the Discover Shapes carousel on the homepage."
      initialData={{ items: initialData.items, revision: initialData.revision }}
      shapeOptions={initialData.shapes}
      shapeFieldLabel="Linked Shape"
    />
  )
}
