import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { formatCategoryPath } from '@/lib/product-catalog'
import type {
  CatalogCategory,
  CatalogOption,
  CatalogSubcategory,
  ProductRecord,
} from '@/lib/product-catalog'
import { HomeBestSellersEditorClient, type HomeBestSellersInitialData, type ProductListItem } from './home-bestsellers-editor-client'

async function getBestSellersInitialData(): Promise<HomeBestSellersInitialData> {
  const adminClient = createSupabaseAdminClient()

  const [{ data: section }, { data: links }, { data: products, error: productsError }, { data: categories }, { data: subcategories }, { data: options }] = await Promise.all([
    adminClient
      .from('cms_home_bestsellers')
      .select('id, eyebrow, heading, cta_label, cta_href, status')
      .eq('status', 'active')
      .maybeSingle(),
    adminClient
      .from('cms_home_bestseller_products')
      .select('section_id, product_id, display_order')
      .order('display_order', { ascending: true }),
    adminClient.from('products').select('*').order('created_at', { ascending: false }),
    adminClient.from('catalog_categories').select('*'),
    adminClient.from('catalog_subcategories').select('*'),
    adminClient.from('catalog_options').select('*'),
  ])

  if (productsError) {
    throw new Error(productsError.message)
  }

  const sectionLinks = (links ?? []).filter((item) => !section?.id || item.section_id === section.id)
  const categoryRows = (categories ?? []) as CatalogCategory[]
  const subcategoryRows = (subcategories ?? []) as CatalogSubcategory[]
  const optionRows = (options ?? []) as CatalogOption[]

  const productRows = ((products ?? []) as ProductRecord[]).map((product) => {
    const category = categoryRows.find((item) => item.id === product.main_category_id)
    const subcategory = subcategoryRows.find((item) => item.id === product.subcategory_id)
    const option = optionRows.find((item) => item.id === product.option_id)

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      categoryPath: formatCategoryPath({ category, subcategory, option }),
      detailTemplate: product.detail_template ?? 'standard',
      status: product.status,
    } as ProductListItem
  })

  return {
    section: {
      eyebrow: section?.eyebrow ?? 'House of Diams',
      heading: section?.heading ?? 'Our Best Sellers',
      cta_label: section?.cta_label ?? 'View All Collection',
      cta_href: section?.cta_href ?? '/shop',
      selected_product_ids: sectionLinks.map((item) => item.product_id),
    },
    products: productRows,
  }
}

export default async function HomeBestSellersEditorPage() {
  const initialData = await getBestSellersInitialData()
  return <HomeBestSellersEditorClient initialData={initialData} />
}
