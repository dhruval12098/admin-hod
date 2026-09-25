import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCatalogRingSnapshot } from '@/lib/catalog-ring-save'
import {
  RingSizesClient,
  type RingCategory,
  type RingCategorySize,
} from './ring-sizes-client'

async function getRingSizesData(): Promise<{
  categories: RingCategory[]
  sizes: RingCategorySize[]
  revision: string
}> {
  const adminClient = createSupabaseAdminClient()
  const snapshot = await loadCatalogRingSnapshot(adminClient)
  return {
    categories: snapshot.categories as RingCategory[],
    sizes: snapshot.sizes as RingCategorySize[],
    revision: snapshot.revision,
  }
}

export default async function RingSizesPage() {
  const { categories, sizes, revision } = await getRingSizesData()
  return <RingSizesClient initialCategories={categories} initialSizes={sizes} initialRevision={revision} />
}
