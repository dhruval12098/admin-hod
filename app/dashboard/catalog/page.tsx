import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { CatalogCategory, CatalogNavbarItem, ProductContentRule } from '@/lib/product-catalog'
import { CatalogClient } from './catalog-client'

async function getCatalogOverviewData(): Promise<{
  categories: CatalogCategory[]
  navbarItems: CatalogNavbarItem[]
  productContentRules: ProductContentRule[]
}> {
  const adminClient = createSupabaseAdminClient()
  const [categoriesResult, navbarItemsResult, productContentRulesResult] = await Promise.all([
    adminClient.from('catalog_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('navbar_items').select('id, label, slug, item_type, linked_category_id, direct_link_url, status').order('display_order', { ascending: true }),
    adminClient.from('product_content_rules').select('*').order('display_order', { ascending: true }),
  ])

  const error = categoriesResult.error || productContentRulesResult.error
  if (error) {
    throw new Error(error.message)
  }

  return {
    categories: (categoriesResult.data ?? []) as CatalogCategory[],
    navbarItems: (navbarItemsResult.error ? [] : navbarItemsResult.data ?? []) as CatalogNavbarItem[],
    productContentRules: (productContentRulesResult.data ?? []) as ProductContentRule[],
  }
}

export default async function CatalogSetupPage() {
  const { categories, navbarItems, productContentRules } = await getCatalogOverviewData()

  return (
    <CatalogClient
      initialCategories={categories}
      initialNavbarItems={navbarItems}
      initialProductContentRules={productContentRules}
    />
  )
}
