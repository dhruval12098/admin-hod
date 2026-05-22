import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { CatalogCategory, CatalogGridPoster, CatalogNavbarItem, CatalogOption, CatalogSubcategory } from '@/lib/product-catalog'
import { CategoryDetailClient } from './page-client'

type CategoryDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

async function getCategoryDetailData(slug: string): Promise<{
  category: CatalogCategory | null
  navbarItems: CatalogNavbarItem[]
  subcategories: CatalogSubcategory[]
  options: CatalogOption[]
  posters: CatalogGridPoster[]
}> {
  const adminClient = createSupabaseAdminClient()
  const [categoriesResult, navbarItemsResult, subcategoriesResult, optionsResult, postersResult] = await Promise.all([
    adminClient.from('catalog_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('navbar_items').select('id, label, slug, item_type, linked_category_id, direct_link_url, status').order('display_order', { ascending: true }),
    adminClient.from('catalog_subcategories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_options').select('*').order('display_order', { ascending: true }),
    adminClient.from('category_grid_posters').select('*').order('display_order', { ascending: true }),
  ])

  const error = categoriesResult.error || subcategoriesResult.error || optionsResult.error
  if (error) {
    throw new Error(error.message)
  }

  const categories = (categoriesResult.data ?? []) as CatalogCategory[]
  const category = categories.find((item) => item.slug === slug) ?? null
  const subcategories = ((subcategoriesResult.data ?? []) as CatalogSubcategory[]).filter(
    (item) => item.category_id === category?.id
  )
  const subcategoryIds = new Set(subcategories.map((item) => item.id))
  const options = ((optionsResult.data ?? []) as CatalogOption[]).filter((item) =>
    subcategoryIds.has(item.subcategory_id)
  )

  return {
    category,
    navbarItems: (navbarItemsResult.error ? [] : navbarItemsResult.data ?? []) as CatalogNavbarItem[],
    subcategories,
    options,
    posters: postersResult.error || !category
      ? []
      : ((postersResult.data ?? []) as CatalogGridPoster[]).filter((item) => item.category_id === category.id),
  }
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params
  const initialData = await getCategoryDetailData(slug)

  return <CategoryDetailClient categorySlug={slug} initialData={initialData} />
}
