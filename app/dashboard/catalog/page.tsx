import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCatalogMasterList } from '@/lib/catalog-master-save'
import { loadCatalogHierarchyList } from '@/lib/catalog-hierarchy-save'
import type { CatalogCategory, CatalogNavbarItem, ProductContentRule } from '@/lib/product-catalog'
import { CatalogClient } from './catalog-client'

async function getCatalogOverviewData(): Promise<{
  categories: CatalogCategory[]
  navbarItems: CatalogNavbarItem[]
  productContentRules: ProductContentRule[]
}> {
  const adminClient = createSupabaseAdminClient()
  const [categories, navbarItemsResult, productContentRulesResult] = await Promise.all([
    loadCatalogHierarchyList(adminClient, 'category'),
    adminClient.from('navbar_items').select('id, label, slug, item_type, linked_category_id, direct_link_url, status').order('display_order', { ascending: true }),
    loadCatalogMasterList(adminClient, 'content_rule'),
  ])

  return {
    categories: categories as CatalogCategory[],
    navbarItems: (navbarItemsResult.error ? [] : navbarItemsResult.data ?? []) as CatalogNavbarItem[],
    productContentRules: productContentRulesResult as ProductContentRule[],
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
