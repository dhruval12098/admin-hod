import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { InventoryClient, type InventoryItem } from './inventory-client'

async function getInventoryItems(): Promise<InventoryItem[]> {
  const adminClient = createSupabaseAdminClient()

  const { data: products, error } = await adminClient
    .from('products')
    .select('id, name, slug, sku, stock_quantity, updated_at, main_category_id, subcategory_id, option_id')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const categoryIds = [...new Set((products ?? []).map((item: any) => item.main_category_id).filter(Boolean))]
  const subcategoryIds = [...new Set((products ?? []).map((item: any) => item.subcategory_id).filter(Boolean))]
  const optionIds = [...new Set((products ?? []).map((item: any) => item.option_id).filter(Boolean))]

  const [categoriesResult, subcategoriesResult, optionsResult] = await Promise.all([
    categoryIds.length ? adminClient.from('catalog_categories').select('id, name').in('id', categoryIds) : Promise.resolve({ data: [] }),
    subcategoryIds.length ? adminClient.from('catalog_subcategories').select('id, name').in('id', subcategoryIds) : Promise.resolve({ data: [] }),
    optionIds.length ? adminClient.from('catalog_options').select('id, name').in('id', optionIds) : Promise.resolve({ data: [] }),
  ])

  const categoryMap = new Map((categoriesResult.data ?? []).map((item: any) => [item.id, item.name]))
  const subcategoryMap = new Map((subcategoriesResult.data ?? []).map((item: any) => [item.id, item.name]))
  const optionMap = new Map((optionsResult.data ?? []).map((item: any) => [item.id, item.name]))

  return (products ?? []).map((product: any) => {
    const stock = Number(product.stock_quantity ?? 0)
    const path = [categoryMap.get(product.main_category_id), subcategoryMap.get(product.subcategory_id), optionMap.get(product.option_id)]
      .filter(Boolean)
      .join(' > ')

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      stockQuantity: stock,
      status: stock <= 0 ? 'out-of-stock' : stock <= 5 ? 'low-stock' : 'in-stock',
      categoryPath: path,
      updatedAt: product.updated_at,
    } as InventoryItem
  })
}

export default async function InventoryPage() {
  const initialItems = await getInventoryItems()
  return <InventoryClient initialItems={initialItems} />
}
