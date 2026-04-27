import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  RingSizesClient,
  type RingCategory,
  type RingCategorySize,
} from './ring-sizes-client'

async function getRingSizesData(): Promise<{
  categories: RingCategory[]
  sizes: RingCategorySize[]
}> {
  const adminClient = createSupabaseAdminClient()
  const [categoriesResult, sizesResult] = await Promise.all([
    adminClient.from('catalog_ring_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_ring_category_sizes').select('*').order('display_order', { ascending: true }),
  ])

  const error = categoriesResult.error || sizesResult.error
  if (error) {
    throw new Error(error.message)
  }

  return {
    categories: (categoriesResult.data ?? []) as RingCategory[],
    sizes: (sizesResult.data ?? []) as RingCategorySize[],
  }
}

export default async function RingSizesPage() {
  const { categories, sizes } = await getRingSizesData()
  return <RingSizesClient initialCategories={categories} initialSizes={sizes} />
}
