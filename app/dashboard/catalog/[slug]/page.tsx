import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { CatalogCategory, CatalogNavbarItem, CatalogOption, CatalogSubcategory } from '@/lib/product-catalog'
import { CategoryDetailClient } from './page-client'
import { loadCatalogHierarchyList } from '@/lib/catalog-hierarchy-save'

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
}> {
  const adminClient = createSupabaseAdminClient()
  const [categories, navbarItemsResult, allSubcategories, allOptions] = await Promise.all([
    loadCatalogHierarchyList(adminClient, 'category'),
    adminClient.from('navbar_items').select('id, label, slug, item_type, linked_category_id, direct_link_url, status').order('display_order', { ascending: true }),
    loadCatalogHierarchyList(adminClient, 'subcategory'),
    loadCatalogHierarchyList(adminClient, 'option'),
  ])
  const category = (categories as CatalogCategory[]).find((item) => item.slug === slug) ?? null
  const subcategories = (allSubcategories as CatalogSubcategory[]).filter(
    (item) => item.category_id === category?.id
  )
  const subcategoryIds = new Set(subcategories.map((item) => item.id))
  const options = (allOptions as CatalogOption[]).filter((item) =>
    subcategoryIds.has(item.subcategory_id)
  )

  return {
    category,
    navbarItems: (navbarItemsResult.error ? [] : navbarItemsResult.data ?? []) as CatalogNavbarItem[],
    subcategories,
    options,
  }
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params
  const initialData = await getCategoryDetailData(slug)

  return <CategoryDetailClient categorySlug={slug} initialData={initialData} />
}
