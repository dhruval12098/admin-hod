import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { CatalogCategory, CatalogOption, CatalogSubcategory } from '@/lib/product-catalog'
import { CategoryDetailClient } from './page-client'

type CategoryDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

async function getCategoryDetailData(slug: string): Promise<{
  category: CatalogCategory | null
  subcategories: CatalogSubcategory[]
  options: CatalogOption[]
}> {
  const adminClient = createSupabaseAdminClient()
  const [categoriesResult, subcategoriesResult, optionsResult] = await Promise.all([
    adminClient.from('catalog_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_subcategories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_options').select('*').order('display_order', { ascending: true }),
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
    subcategories,
    options,
  }
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params
  const initialData = await getCategoryDetailData(slug)

  return <CategoryDetailClient categorySlug={slug} initialData={initialData} />
}
