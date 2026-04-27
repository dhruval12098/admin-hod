import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { formatCategoryPath } from '@/lib/product-catalog'
import type {
  CatalogCategory,
  CatalogOption,
  CatalogSubcategory,
  ProductRecord,
} from '@/lib/product-catalog'
import type { ProductRow } from './products-client'

export type ProductLane = 'standard' | 'hiphop' | 'collection'

type RelatedNameRow = { name?: string | null } | Array<{ name?: string | null }> | null

function extractRelatedName(value: RelatedNameRow) {
  return Array.isArray(value) ? value[0]?.name ?? null : value?.name ?? null
}

export async function getProductRows(lane?: ProductLane): Promise<ProductRow[]> {
  const adminClient = createSupabaseAdminClient()
  let query = adminClient.from('products').select('*').order('created_at', { ascending: false })

  if (lane) {
    query = query.eq('product_lane', lane)
  }

  const { data: products, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const productIds = (products ?? []).map((product) => product.id)
  const [metalSelections, categoriesResult, subcategoriesResult, optionsResult] = await Promise.all([
    productIds.length
      ? adminClient.from('product_metal_selections').select('product_id, metal:catalog_metals(name)').in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
    adminClient.from('catalog_categories').select('*'),
    adminClient.from('catalog_subcategories').select('*'),
    adminClient.from('catalog_options').select('*'),
  ])

  const categories = (categoriesResult.data ?? []) as CatalogCategory[]
  const subcategories = (subcategoriesResult.data ?? []) as CatalogSubcategory[]
  const options = (optionsResult.data ?? []) as CatalogOption[]

  const metalMap = new Map<string, string[]>()
  for (const row of metalSelections.data ?? []) {
    const name = extractRelatedName(row.metal as RelatedNameRow)
    if (!name) continue
    metalMap.set(row.product_id, [...(metalMap.get(row.product_id) ?? []), name])
  }

  return ((products ?? []) as ProductRecord[]).map((product) => {
    const category = categories.find((item) => item.id === product.main_category_id)
    const subcategory = subcategories.find((item) => item.id === product.subcategory_id)
    const option = options.find((item) => item.id === product.option_id)

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      productLane: product.product_lane ?? 'standard',
      detailTemplate: product.detail_template ?? 'standard',
      mainCategorySlug: category?.slug ?? '',
      mainCategoryName: category?.name ?? '',
      categoryPath: formatCategoryPath({
        category,
        subcategory,
        option,
      }),
      type: option?.name || subcategory?.name || category?.name || '',
      price: product.base_price,
      stock: product.stock_quantity ?? 0,
      featured: product.featured,
      status: product.status,
      metals: metalMap.get(product.id) ?? [],
    } as ProductRow & { metals?: string[] }
  })
}
