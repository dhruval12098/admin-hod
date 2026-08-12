import { cache } from 'react'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { BootstrapPayload } from '@/components/product-form'

async function loadOptionalTable(adminClient: any, table: string, columns = '*') {
  const result = await adminClient.from(table).select(columns).order('display_order', { ascending: true })
  if (result.error) return []
  return result.data ?? []
}

export const getProductFormBasicsBootstrap = cache(async (): Promise<BootstrapPayload> => {
  const adminClient = createSupabaseAdminClient()

  const [categoriesResult, subcategoriesResult, optionsResult, styles] = await Promise.all([
    adminClient.from('catalog_categories').select('id, code, name, slug, category_lane, display_order, status').order('display_order', { ascending: true }),
    adminClient.from('catalog_subcategories').select('id, category_id, name, slug, sub_type, display_order, status').order('display_order', { ascending: true }),
    adminClient.from('catalog_options').select('id, subcategory_id, name, slug, display_order, status').order('display_order', { ascending: true }),
    loadOptionalTable(adminClient, 'catalog_styles', 'id, name, icon_svg_path, display_order, status'),
  ])

  return {
    categories: categoriesResult.data ?? [],
    subcategories: subcategoriesResult.data ?? [],
    options: optionsResult.data ?? [],
    styles,
  }
})
