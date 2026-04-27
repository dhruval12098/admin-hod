import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { CatalogCategory, ProductContentRule } from '@/lib/product-catalog'
import { CatalogClient } from './catalog-client'

async function getCatalogOverviewData(): Promise<{
  categories: CatalogCategory[]
  productContentRules: ProductContentRule[]
}> {
  const adminClient = createSupabaseAdminClient()
  const [categoriesResult, productContentRulesResult] = await Promise.all([
    adminClient.from('catalog_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('product_content_rules').select('*').order('display_order', { ascending: true }),
  ])

  const error = categoriesResult.error || productContentRulesResult.error
  if (error) {
    throw new Error(error.message)
  }

  return {
    categories: (categoriesResult.data ?? []) as CatalogCategory[],
    productContentRules: (productContentRulesResult.data ?? []) as ProductContentRule[],
  }
}

export default async function CatalogSetupPage() {
  const { categories, productContentRules } = await getCatalogOverviewData()

  return (
    <CatalogClient
      initialCategories={categories}
      initialProductContentRules={productContentRules}
    />
  )
}
