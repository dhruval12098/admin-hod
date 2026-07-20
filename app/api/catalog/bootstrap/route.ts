import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

async function loadOptionalTable(adminClient: any, table: string, columns = '*') {
  const result = await adminClient.from(table).select(columns).order('display_order', { ascending: true })
  if (result.error) return []
  return result.data ?? []
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') ?? 'all'
  const includeBasics = scope === 'all' || scope === 'basics'
  const includePricing = scope === 'all' || scope === 'pricing'
  const includeAttributes = scope === 'all' || scope === 'attributes'
  const includeContent = scope === 'all' || scope === 'content'

  const [categoriesResult, subcategoriesResult, optionsResult, metalsResult, materialValues, stoneShapesResult, ringSizes, ringCategories, ringCategorySizes, certificates, styles, productContentRules, gstSlabs, navbarItemsResult] = await Promise.all([
    includeBasics ? adminClient.from('catalog_categories').select('id, code, name, slug, category_lane, display_order, status').order('display_order', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    includeBasics ? adminClient.from('catalog_subcategories').select('id, category_id, name, slug, sub_type, display_order, status').order('display_order', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    includeBasics ? adminClient.from('catalog_options').select('id, subcategory_id, name, slug, display_order, status').order('display_order', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    (includePricing || includeAttributes) ? adminClient.from('catalog_metals').select('id, name, slug, purity_label, base_metal_name, display_label, is_combined_option, color_hex, display_order, status').order('display_order', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    includeAttributes ? loadOptionalTable(adminClient, 'catalog_material_values', 'id, name, slug, display_order, status') : Promise.resolve([]),
    includeAttributes ? adminClient.from('catalog_stone_shapes').select('id, name, slug, svg_asset_url, display_order, status').order('display_order', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    includeAttributes ? loadOptionalTable(adminClient, 'catalog_ring_sizes', 'id, name, slug, display_order, status') : Promise.resolve([]),
    includeAttributes ? loadOptionalTable(adminClient, 'catalog_ring_categories', 'id, name, slug, description, display_order, status') : Promise.resolve([]),
    includeAttributes ? loadOptionalTable(adminClient, 'catalog_ring_category_sizes', 'id, ring_category_id, size_label, size_value, display_order, status') : Promise.resolve([]),
    (includePricing || includeAttributes) ? loadOptionalTable(adminClient, 'catalog_certificates', 'id, name, code, slug, display_order, status') : Promise.resolve([]),
    includeBasics ? loadOptionalTable(adminClient, 'catalog_styles', 'id, name, icon_svg_path, display_order, status') : Promise.resolve([]),
    includeContent ? loadOptionalTable(adminClient, 'product_content_rules', 'id, kind, name, slug, title, body, display_order, status') : Promise.resolve([]),
    includePricing ? loadOptionalTable(adminClient, 'catalog_gst_slabs', 'id, name, code, percentage, description, display_order, status') : Promise.resolve([]),
    scope === 'all' ? adminClient.from('navbar_items').select('id, label, slug, item_type, linked_category_id, direct_link_url, status').order('display_order', { ascending: true }) : Promise.resolve({ data: [], error: null }),
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
    ...(includeBasics
      ? {
          categories: categoriesResult.data ?? [],
          subcategories: subcategoriesResult.data ?? [],
          options: optionsResult.data ?? [],
          styles,
        }
      : {}),
    ...(includePricing
      ? {
          metals: metalsResult.data ?? [],
          certificates,
          gstSlabs,
        }
      : {}),
    ...(includeAttributes
      ? {
          metals: metalsResult.data ?? [],
          materialValues,
          stoneShapes: stoneShapesResult.data ?? [],
          ringSizes,
          ringCategories,
          ringCategorySizes,
          certificates,
        }
      : {}),
    ...(includeContent
      ? {
          productContentRules,
        }
      : {}),
    ...(scope === 'all'
      ? {
          navbarItems: navbarItemsResult.error ? [] : navbarItemsResult.data ?? [],
        }
      : {}),
  })
}
