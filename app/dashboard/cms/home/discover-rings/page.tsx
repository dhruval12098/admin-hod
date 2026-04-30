import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { DiscoverItemsEditorClient, type DiscoverItemsInitialData } from '@/components/discover-items-editor-client'

async function getInitialData(): Promise<{
  items: DiscoverItemsInitialData['items']
  linkTargetGroups: Array<{
    kind: string
    label: string
    options: Array<{ id: string; name: string }>
  }>
}> {
  const adminClient = createSupabaseAdminClient()
  const [
    { data, error },
    { data: categories, error: categoriesError },
    { data: subcategories, error: subcategoriesError },
    { data: options, error: optionsError },
    { data: shapes, error: shapesError },
    { data: styles, error: stylesError },
  ] = await Promise.all([
    adminClient
      .from('discover_rings_items')
      .select('*')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('catalog_categories')
      .select('id, name')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
    adminClient
      .from('catalog_subcategories')
      .select('id, name')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
    adminClient
      .from('catalog_options')
      .select('id, name')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
    adminClient
      .from('catalog_stone_shapes')
      .select('id, name')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
    adminClient
      .from('catalog_styles')
      .select('id, name')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
  ])

  if (error) {
    throw new Error(error.message)
  }
  if (categoriesError) throw new Error(categoriesError.message)
  if (subcategoriesError) throw new Error(subcategoriesError.message)
  if (optionsError) throw new Error(optionsError.message)
  if (shapesError) throw new Error(shapesError.message)
  if (stylesError) throw new Error(stylesError.message)

  return {
    items: (data ?? []).map((item) => ({
      sort_order: item.sort_order,
      title: item.title,
      description: item.description,
      image_path: item.image_path,
      image_alt: item.image_alt,
      target_kind: item.target_kind ?? '',
      target_id: item.target_id ?? '',
    })),
    linkTargetGroups: [
      { kind: 'category', label: 'Category', options: categories ?? [] },
      { kind: 'subcategory', label: 'Subcategory', options: subcategories ?? [] },
      { kind: 'option', label: 'Option', options: options ?? [] },
      { kind: 'shape', label: 'Shape', options: shapes ?? [] },
      { kind: 'style', label: 'Style', options: styles ?? [] },
    ],
  }
}

export default async function DiscoverRingsEditorPage() {
  const initialData = await getInitialData()

  return (
    <DiscoverItemsEditorClient
      backHref="/dashboard/cms/home"
      sectionName="Discover Rings"
      sectionDescription="Manage the carousel items for the Discover Rings section. Section heading and intro stay static. Each item links from the exact category, subcategory, option, shape, or style you select."
      saveEndpoint="/api/cms/home/discover-rings"
      uploadEndpoint="/api/cms/uploads/discover-rings"
      saveDescription="This will update the Discover Rings carousel on the homepage."
      initialData={{ items: initialData.items }}
      linkTargetGroups={initialData.linkTargetGroups}
      linkTargetKindLabel="Linked Target Type"
      linkTargetItemLabel="Linked Target"
    />
  )
}
