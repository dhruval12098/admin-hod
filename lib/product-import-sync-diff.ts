import 'server-only'

import { buildAdminClient } from '@/lib/cms-auth'
import { normalizeImportValue } from '@/lib/import-normalization'
import type { ParsedProductImportRow } from '@/lib/product-import-staging'

type LookupRow = { id: string; name: string }
type ProductLookupRow = {
  id: string
  sku: string | null
  name: string | null
  description: string | null
  main_category_id: string | null
  subcategory_id: string | null
  option_id: string | null
  style_id: string | null
  discount_price: number | string | null
  image_1_path: string | null
}
type MetalSelectionRow = { product_id: string; metal_id: string }
type PurityRow = { product_id: string; purity_label: string; price: number | string | null }
type MaterialSelectionRow = { product_id: string; material_value_id: string }

type ExistingProductSnapshot = {
  id: string
  sku: string
  product_name: string
  description: string
  category: string
  subcategory: string
  option_name: string
  style_name: string
  discount_price: string
  purity_1_label: string
  purity_1_price: string
  image_1: string
  metals_raw: string[]
  material_values: string[]
}

function normalizeMoneyLike(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return String(numeric)
}

function normalizeList(values: Array<string | null | undefined>) {
  return values.map((value) => normalizeImportValue(value)).filter(Boolean).sort()
}

function sameLists(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

async function loadReferenceMaps(adminClient: any) {
  const [categories, subcategories, options, styles, materialValues] = await Promise.all([
    adminClient.from('catalog_categories').select('id, name'),
    adminClient.from('catalog_subcategories').select('id, name'),
    adminClient.from('catalog_options').select('id, name'),
    adminClient.from('catalog_styles').select('id, name'),
    adminClient.from('catalog_material_values').select('id, name'),
  ])

  return {
    categoriesById: new Map<string, string>(((categories.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    subcategoriesById: new Map<string, string>(((subcategories.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    optionsById: new Map<string, string>(((options.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    stylesById: new Map<string, string>(((styles.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    materialValuesById: new Map<string, string>(((materialValues.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
  }
}

export async function classifyGoogleSheetRows(
  rows: Array<{ rowNumber: number; values: ParsedProductImportRow }>
) {
  const adminClient = buildAdminClient()
  if (!adminClient) {
    throw new Error('Admin client is not available.')
  }

  const refs = await loadReferenceMaps(adminClient)
  const skus = rows.map((entry) => entry.values.sku?.trim()).filter((value): value is string => Boolean(value))

  const [productsResult, metalSelectionsResult, metalsResult, purityResult, materialSelectionsResult] = await Promise.all([
    adminClient
      .from('products')
      .select('id, sku, name, description, main_category_id, subcategory_id, option_id, style_id, discount_price, image_1_path')
      .in('sku', skus),
    adminClient.from('product_metal_selections').select('product_id, metal_id').order('sort_order', { ascending: true }),
    adminClient.from('catalog_metals').select('id, name'),
    adminClient.from('product_purity_prices').select('product_id, purity_label, price, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_material_value_selections').select('product_id, material_value_id').order('sort_order', { ascending: true }),
  ])

  if (productsResult.error) throw new Error(productsResult.error.message)
  if (metalSelectionsResult.error) throw new Error(metalSelectionsResult.error.message)
  if (metalsResult.error) throw new Error(metalsResult.error.message)
  if (purityResult.error) throw new Error(purityResult.error.message)
  if (materialSelectionsResult.error) throw new Error(materialSelectionsResult.error.message)

  const metalNameById = new Map<string, string>(((metalsResult.data ?? []) as LookupRow[]).map((row) => [row.id, row.name]))

  const metalsByProduct = new Map<string, string[]>()
  for (const row of (metalSelectionsResult.data ?? []) as MetalSelectionRow[]) {
    const current = metalsByProduct.get(row.product_id) ?? []
    const metalName = metalNameById.get(row.metal_id)
    if (metalName) current.push(metalName)
    metalsByProduct.set(row.product_id, current)
  }

  const purityByProduct = new Map<string, Array<{ purity_label: string; price: number }>>()
  for (const row of (purityResult.data ?? []) as PurityRow[]) {
    const current = purityByProduct.get(row.product_id) ?? []
    current.push({ purity_label: row.purity_label, price: Number(row.price ?? 0) })
    purityByProduct.set(row.product_id, current)
  }

  const materialValuesByProduct = new Map<string, string[]>()
  for (const row of (materialSelectionsResult.data ?? []) as MaterialSelectionRow[]) {
    const current = materialValuesByProduct.get(row.product_id) ?? []
    const name = refs.materialValuesById.get(row.material_value_id)
    if (name) current.push(name)
    materialValuesByProduct.set(row.product_id, current)
  }

  const snapshotsBySku = new Map<string, ExistingProductSnapshot>()
  for (const product of (productsResult.data ?? []) as ProductLookupRow[]) {
    const purityRows = purityByProduct.get(product.id) ?? []
    const firstPurity = purityRows[0] ?? null
    snapshotsBySku.set(normalizeImportValue(product.sku), {
      id: product.id,
      sku: product.sku ?? '',
      product_name: product.name ?? '',
      description: product.description ?? '',
      category: refs.categoriesById.get(product.main_category_id ?? '') ?? '',
      subcategory: refs.subcategoriesById.get(product.subcategory_id ?? '') ?? '',
      option_name: refs.optionsById.get(product.option_id ?? '') ?? '',
      style_name: refs.stylesById.get(product.style_id ?? '') ?? '',
      discount_price: normalizeMoneyLike(product.discount_price),
      purity_1_label: firstPurity?.purity_label ?? '',
      purity_1_price: normalizeMoneyLike(firstPurity?.price),
      image_1: product.image_1_path ?? '',
      metals_raw: metalsByProduct.get(product.id) ?? [],
      material_values: materialValuesByProduct.get(product.id) ?? [],
    })
  }

  const classifiedRows = rows.map((entry) => {
    const normalizedSku = normalizeImportValue(entry.values.sku)
    const existing = snapshotsBySku.get(normalizedSku)
    if (!existing) {
      return { ...entry, changeType: 'new' as const }
    }

    const sameCore =
      normalizeImportValue(existing.product_name) === normalizeImportValue(entry.values.product_name) &&
      normalizeImportValue(existing.description) === normalizeImportValue(entry.values.description) &&
      normalizeImportValue(existing.category) === normalizeImportValue(entry.values.category) &&
      normalizeImportValue(existing.subcategory) === normalizeImportValue(entry.values.subcategory) &&
      normalizeImportValue(existing.option_name) === normalizeImportValue(entry.values.option_name) &&
      normalizeImportValue(existing.style_name) === normalizeImportValue(entry.values.style_name) &&
      normalizeMoneyLike(existing.discount_price) === normalizeMoneyLike(entry.values.discount_price) &&
      normalizeImportValue(existing.purity_1_label) === normalizeImportValue(entry.values.purity_1_label) &&
      normalizeMoneyLike(existing.purity_1_price) === normalizeMoneyLike(entry.values.purity_1_price) &&
      normalizeImportValue(existing.image_1) === normalizeImportValue(entry.values.image_1) &&
      sameLists(normalizeList(existing.metals_raw), normalizeList([entry.values.metal_1, entry.values.metal_2, entry.values.metal_3])) &&
      sameLists(normalizeList(existing.material_values), normalizeList([entry.values.material_value_1, entry.values.material_value_2, entry.values.material_value_3, entry.values.material_value_4]))

    return {
      ...entry,
      changeType: sameCore ? ('unchanged' as const) : ('updated' as const),
    }
  })

  return {
    rows: classifiedRows,
    summary: {
      newCount: classifiedRows.filter((entry) => entry.changeType === 'new').length,
      updatedCount: classifiedRows.filter((entry) => entry.changeType === 'updated').length,
      unchangedCount: classifiedRows.filter((entry) => entry.changeType === 'unchanged').length,
    },
  }
}
