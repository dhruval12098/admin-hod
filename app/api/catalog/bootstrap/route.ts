import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

async function loadOptionalTable(adminClient: any, table: string) {
  const result = await adminClient.from(table).select('*').order('display_order', { ascending: true })
  if (result.error) return []
  return result.data ?? []
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access

  const [categoriesResult, subcategoriesResult, optionsResult, metalsResult, stoneShapesResult, ringSizes, ringCategories, ringCategorySizes, certificates, styles, productContentRules, gstSlabs] = await Promise.all([
    adminClient.from('catalog_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_subcategories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_options').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_metals').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_stone_shapes').select('*').order('display_order', { ascending: true }),
    loadOptionalTable(adminClient, 'catalog_ring_sizes'),
    loadOptionalTable(adminClient, 'catalog_ring_categories'),
    loadOptionalTable(adminClient, 'catalog_ring_category_sizes'),
    loadOptionalTable(adminClient, 'catalog_certificates'),
    loadOptionalTable(adminClient, 'catalog_styles'),
    loadOptionalTable(adminClient, 'product_content_rules'),
    loadOptionalTable(adminClient, 'catalog_gst_slabs'),
  ])

  const error =
    categoriesResult.error ||
    subcategoriesResult.error ||
    optionsResult.error ||
    metalsResult.error ||
    stoneShapesResult.error

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    categories: categoriesResult.data ?? [],
    subcategories: subcategoriesResult.data ?? [],
    options: optionsResult.data ?? [],
    metals: metalsResult.data ?? [],
    stoneShapes: stoneShapesResult.data ?? [],
    ringSizes,
    ringCategories,
    ringCategorySizes,
    certificates,
    styles,
    productContentRules,
    gstSlabs,
  })
}
