import 'server-only'

import { buildAdminClient } from '@/lib/cms-auth'
import { normalizeImportValue } from '@/lib/import-normalization'
import { buildCombinedMetalDisplayLabel } from '@/lib/product-metal-variants'
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
  image_2_path: string | null
  image_3_path: string | null
  image_4_path: string | null
  video_path: string | null
}
type MetalSelectionRow = { product_id: string; metal_id: string }
type PurityRow = { product_id: string; purity_label: string; price: number | string | null }
type MaterialSelectionRow = { product_id: string; material_value_id: string }
type ProductSubcategoryLinkRow = { product_id: string; subcategory_id: string; is_primary?: boolean | null }
type ProductOptionLinkRow = { product_id: string; option_id: string; is_primary?: boolean | null }
type ProductStoneShapeRow = { product_id: string; shape_id: string }
type CatalogMetalRow = {
  id: string
  name: string
  purity_label?: string | null
  base_metal_name?: string | null
  display_label?: string | null
}
type ProductMetalVariantRow = {
  id: string
  product_id: string
  metal_id: string
  price: number | string | null
  sort_order?: number | null
}
type ProductVariantMediaItemRow = {
  product_id: string
  variant_id: string | null
  media_type: string
  media_path: string | null
  sort_order?: number | null
  is_default_fallback?: boolean | null
}

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
  image_2: string
  image_3: string
  image_4: string
  metals_raw: string[]
  material_values: string[]
  stone_shapes: string[]
  linked_subcategories: string[]
  linked_options: string[]
  variant_combined_values: string
  variant_price_values: string
  variant_image_group_values: string
  variant_video_group_values: string
}

export type GoogleSheetRowChangeField =
  | 'product_name'
  | 'description'
  | 'category'
  | 'subcategory'
  | 'option_name'
  | 'style_name'
  | 'discount_price'
  | 'images'
  | 'metal_variants'
  | 'variant_prices'
  | 'variant_images'
  | 'variant_videos'
  | 'materials'
  | 'stone_shapes'

export type ClassifiedGoogleSheetRow = {
  rowNumber: number
  values: ParsedProductImportRow
  changeType: 'new' | 'updated' | 'unchanged'
  changedFields: GoogleSheetRowChangeField[]
}

function normalizeMoneyLike(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return String(numeric)
}

function strictComparable(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeList(values: Array<string | null | undefined>) {
  const uniqueValues = new Map<string, string>()
  for (const value of values) {
    const displayValue = strictComparable(value)
    const normalizedValue = normalizeImportValue(displayValue)
    if (!normalizedValue || uniqueValues.has(normalizedValue)) continue
    uniqueValues.set(normalizedValue, displayValue)
  }
  return Array.from(uniqueValues.values())
}

function normalizeComparableList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeImportValue(value))
        .filter(Boolean)
    )
  ).sort()
}

function splitMultiValues(value: string | null | undefined) {
  return (value ?? '')
    .split(/[,\|]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function sameLists(left: string[], right: string[]) {
  const normalizedLeft = normalizeComparableList(left)
  const normalizedRight = normalizeComparableList(right)
  return normalizedLeft.length === normalizedRight.length && normalizedLeft.every((value, index) => value === normalizedRight[index])
}

function splitGroupedValues(value: string | null | undefined) {
  return (value ?? '')
    .split(/~~|\|/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function splitCommaValues(value: string | null | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeMediaValue(value: unknown) {
  const rawValue = strictComparable(value)
  if (!rawValue || rawValue === '[object Object]') return ''

  let comparableValue = rawValue
  try {
    const parsedUrl = new URL(rawValue)
    comparableValue = decodeURIComponent(parsedUrl.pathname)
  } catch {
    comparableValue = rawValue
  }

  return comparableValue
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/public\/[^/]+\//, '')
    .trim()
}

function sameMediaValue(left: unknown, right: unknown) {
  const normalizedLeft = normalizeMediaValue(left)
  const normalizedRight = normalizeMediaValue(right)
  if (!normalizedLeft && !normalizedRight) return true
  if (!normalizedLeft || !normalizedRight) return false
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.endsWith(normalizedRight) ||
    normalizedRight.endsWith(normalizedLeft)
  )
}

function hasMediaValues(values: unknown[]) {
  return values.some((value) => Boolean(normalizeMediaValue(value)))
}

function normalizeGroupedMediaValues(value: string) {
  return splitGroupedValues(value)
    .map((group) => splitCommaValues(group).map(normalizeMediaValue).filter(Boolean))
    .filter((group) => group.length > 0)
}

function sameGroupedMediaValues(left: string, right: string) {
  const leftGroups = normalizeGroupedMediaValues(left)
  const rightGroups = normalizeGroupedMediaValues(right)
  if (leftGroups.length !== rightGroups.length) return false

  return leftGroups.every((leftGroup, groupIndex) => {
    const rightGroup = rightGroups[groupIndex] ?? []
    if (leftGroup.length !== rightGroup.length) return false
    return leftGroup.every((leftValue, itemIndex) => sameMediaValue(leftValue, rightGroup[itemIndex]))
  })
}

async function loadReferenceMaps(adminClient: any) {
  const [categories, subcategories, options, styles, materialValues, stoneShapes] = await Promise.all([
    adminClient.from('catalog_categories').select('id, name'),
    adminClient.from('catalog_subcategories').select('id, name'),
    adminClient.from('catalog_options').select('id, name'),
    adminClient.from('catalog_styles').select('id, name'),
    adminClient.from('catalog_material_values').select('id, name'),
    adminClient.from('catalog_stone_shapes').select('id, name'),
  ])

  return {
    categoriesById: new Map<string, string>(((categories.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    subcategoriesById: new Map<string, string>(((subcategories.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    optionsById: new Map<string, string>(((options.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    stylesById: new Map<string, string>(((styles.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    materialValuesById: new Map<string, string>(((materialValues.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
    stoneShapesById: new Map<string, string>(((stoneShapes.data ?? []) as LookupRow[]).map((row) => [row.id, row.name])),
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

  const [productsResult, metalSelectionsResult, metalsResult, purityResult, materialSelectionsResult, stoneShapeSelectionsResult, subcategoryLinksResult, optionLinksResult, metalVariantsResult, variantMediaResult] = await Promise.all([
    adminClient
      .from('products')
      .select('id, sku, name, description, main_category_id, subcategory_id, option_id, style_id, discount_price, image_1_path, image_2_path, image_3_path, image_4_path, video_path')
      .in('sku', skus),
    adminClient.from('product_metal_selections').select('product_id, metal_id').order('sort_order', { ascending: true }),
    adminClient.from('catalog_metals').select('id, name, purity_label, base_metal_name, display_label'),
    adminClient.from('product_purity_prices').select('product_id, purity_label, price, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_material_value_selections').select('product_id, material_value_id').order('sort_order', { ascending: true }),
    adminClient.from('product_stone_shapes').select('product_id, shape_id'),
    adminClient.from('product_subcategory_links').select('product_id, subcategory_id, is_primary').order('sort_order', { ascending: true }),
    adminClient.from('product_option_links').select('product_id, option_id, is_primary').order('sort_order', { ascending: true }),
    adminClient.from('product_metal_variants').select('id, product_id, metal_id, price, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_variant_media_items').select('product_id, variant_id, media_type, media_path, sort_order, is_default_fallback').order('sort_order', { ascending: true }),
  ])

  if (productsResult.error) throw new Error(productsResult.error.message)
  if (metalSelectionsResult.error) throw new Error(metalSelectionsResult.error.message)
  if (metalsResult.error) throw new Error(metalsResult.error.message)
  if (purityResult.error) throw new Error(purityResult.error.message)
  if (materialSelectionsResult.error) throw new Error(materialSelectionsResult.error.message)
  if (stoneShapeSelectionsResult.error) throw new Error(stoneShapeSelectionsResult.error.message)
  if (subcategoryLinksResult.error) throw new Error(subcategoryLinksResult.error.message)
  if (optionLinksResult.error) throw new Error(optionLinksResult.error.message)
  if (metalVariantsResult.error) throw new Error(metalVariantsResult.error.message)
  if (variantMediaResult.error) throw new Error(variantMediaResult.error.message)

  const metalRows = (metalsResult.data ?? []) as CatalogMetalRow[]
  const metalNameById = new Map<string, string>(metalRows.map((row) => [row.id, row.name]))
  const metalLabelById = new Map<string, string>(metalRows.map((row) => [row.id, buildCombinedMetalDisplayLabel(row)]))

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

  const stoneShapesByProduct = new Map<string, string[]>()
  for (const row of (stoneShapeSelectionsResult.data ?? []) as ProductStoneShapeRow[]) {
    const current = stoneShapesByProduct.get(row.product_id) ?? []
    const name = refs.stoneShapesById.get(row.shape_id)
    if (name) current.push(name)
    stoneShapesByProduct.set(row.product_id, current)
  }

  const linkedSubcategoriesByProduct = new Map<string, string[]>()
  for (const row of (subcategoryLinksResult.data ?? []) as ProductSubcategoryLinkRow[]) {
    if (row.is_primary) continue
    const name = refs.subcategoriesById.get(row.subcategory_id)
    if (!name) continue
    linkedSubcategoriesByProduct.set(row.product_id, [...(linkedSubcategoriesByProduct.get(row.product_id) ?? []), name])
  }

  const linkedOptionsByProduct = new Map<string, string[]>()
  for (const row of (optionLinksResult.data ?? []) as ProductOptionLinkRow[]) {
    if (row.is_primary) continue
    const name = refs.optionsById.get(row.option_id)
    if (!name) continue
    linkedOptionsByProduct.set(row.product_id, [...(linkedOptionsByProduct.get(row.product_id) ?? []), name])
  }

  const metalVariantsByProduct = new Map<string, ProductMetalVariantRow[]>()
  for (const row of (metalVariantsResult.data ?? []) as ProductMetalVariantRow[]) {
    metalVariantsByProduct.set(row.product_id, [...(metalVariantsByProduct.get(row.product_id) ?? []), row])
  }

  const variantMediaByVariantId = new Map<string, ProductVariantMediaItemRow[]>()
  for (const row of (variantMediaResult.data ?? []) as ProductVariantMediaItemRow[]) {
    if (!row.variant_id) continue
    variantMediaByVariantId.set(row.variant_id, [...(variantMediaByVariantId.get(row.variant_id) ?? []), row])
  }

  const snapshotsBySku = new Map<string, ExistingProductSnapshot>()
  for (const product of (productsResult.data ?? []) as ProductLookupRow[]) {
    const purityRows = purityByProduct.get(product.id) ?? []
    const firstPurity = purityRows[0] ?? null
    const variantRows = metalVariantsByProduct.get(product.id) ?? []
    const variantLabels = variantRows.map((row) => metalLabelById.get(row.metal_id) ?? metalNameById.get(row.metal_id) ?? '').filter(Boolean)
    const variantPrices = variantRows.map((row) => normalizeMoneyLike(row.price)).filter(Boolean)
    const variantImageGroups = variantRows
      .map((variant) =>
        (variantMediaByVariantId.get(variant.id) ?? [])
          .filter((item) => item.media_type === 'image')
          .map((item) => strictComparable(item.media_path))
          .filter(Boolean)
          .join(',')
      )
      .filter(Boolean)
    const variantVideoGroups = variantRows
      .map((variant) =>
        (variantMediaByVariantId.get(variant.id) ?? [])
          .filter((item) => item.media_type === 'video')
          .map((item) => strictComparable(item.media_path))
          .filter(Boolean)
          .join(',')
      )
      .filter(Boolean)

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
      image_2: product.image_2_path ?? '',
      image_3: product.image_3_path ?? '',
      image_4: product.image_4_path ?? '',
      metals_raw: metalsByProduct.get(product.id) ?? [],
      material_values: materialValuesByProduct.get(product.id) ?? [],
      stone_shapes: stoneShapesByProduct.get(product.id) ?? [],
      linked_subcategories: linkedSubcategoriesByProduct.get(product.id) ?? [],
      linked_options: linkedOptionsByProduct.get(product.id) ?? [],
      variant_combined_values: variantLabels.join('~~'),
      variant_price_values: variantPrices.join('~~'),
      variant_image_group_values: variantImageGroups.join('~~'),
      variant_video_group_values: variantVideoGroups.join('~~'),
    })
  }

  const classifiedRows: ClassifiedGoogleSheetRow[] = rows.map((entry) => {
    const normalizedSku = normalizeImportValue(entry.values.sku)
    const existing = snapshotsBySku.get(normalizedSku)
    if (!existing) {
      return { ...entry, changeType: 'new' as const, changedFields: [] }
    }

    const expectedSubcategories = normalizeList([
      entry.values.subcategory,
      ...splitMultiValues((entry.values as ParsedProductImportRow & { source_subcategory?: string }).source_subcategory),
    ])
    const existingSubcategories = normalizeList([existing.subcategory, ...existing.linked_subcategories])
    const expectedOptions = normalizeList([
      entry.values.option_name,
      ...splitMultiValues((entry.values as ParsedProductImportRow & { source_option?: string }).source_option),
    ])
    const existingOptions = normalizeList([existing.option_name, ...existing.linked_options])
    const expectedStoneShapes = normalizeList(splitMultiValues((entry.values as ParsedProductImportRow & { source_shape?: string }).source_shape))
    const incomingVariantLabels = splitGroupedValues(entry.values.variant_combined_values).join('~~')
    const incomingVariantPrices = splitGroupedValues(entry.values.variant_price_values).join('~~')
    const incomingVariantImageGroups = splitGroupedValues(entry.values.variant_image_group_values)
      .map((group) => splitCommaValues(group).join(','))
      .join('~~')
    const incomingVariantVideoGroups = splitGroupedValues(entry.values.variant_video_group_values)
      .map((group) => splitCommaValues(group).join(','))
      .join('~~')
    const hasCombinedVariantPayload =
      incomingVariantLabels.length > 0 ||
      incomingVariantPrices.length > 0 ||
      incomingVariantImageGroups.length > 0 ||
      incomingVariantVideoGroups.length > 0

    const changedFields: GoogleSheetRowChangeField[] = []
    if (strictComparable(existing.product_name) !== strictComparable(entry.values.product_name)) changedFields.push('product_name')
    if (strictComparable(existing.description) !== strictComparable(entry.values.description)) changedFields.push('description')
    if (normalizeImportValue(existing.category) !== normalizeImportValue(entry.values.category)) changedFields.push('category')
    if (!sameLists(existingSubcategories, expectedSubcategories)) changedFields.push('subcategory')
    if (!sameLists(existingOptions, expectedOptions)) changedFields.push('option_name')
    if (normalizeImportValue(existing.style_name) !== normalizeImportValue(entry.values.style_name)) changedFields.push('style_name')
    if (normalizeMoneyLike(existing.discount_price) !== normalizeMoneyLike(entry.values.discount_price)) changedFields.push('discount_price')
    const hasIncomingFallbackImages = hasMediaValues([entry.values.image_1, entry.values.image_2, entry.values.image_3, entry.values.image_4])
    if (
      hasIncomingFallbackImages &&
      (
        !sameMediaValue(existing.image_1, entry.values.image_1) ||
        !sameMediaValue(existing.image_2, entry.values.image_2) ||
        !sameMediaValue(existing.image_3, entry.values.image_3) ||
        !sameMediaValue(existing.image_4, entry.values.image_4)
      )
    ) {
      changedFields.push('images')
    }

    if (hasCombinedVariantPayload) {
      if (!sameLists(splitGroupedValues(existing.variant_combined_values), splitGroupedValues(incomingVariantLabels))) changedFields.push('metal_variants')
      if (strictComparable(existing.variant_price_values) !== strictComparable(incomingVariantPrices)) changedFields.push('variant_prices')
      if (normalizeGroupedMediaValues(incomingVariantImageGroups).length > 0 && !sameGroupedMediaValues(existing.variant_image_group_values, incomingVariantImageGroups)) changedFields.push('variant_images')
      if (normalizeGroupedMediaValues(incomingVariantVideoGroups).length > 0 && !sameGroupedMediaValues(existing.variant_video_group_values, incomingVariantVideoGroups)) changedFields.push('variant_videos')
    } else {
      if (
        normalizeImportValue(existing.purity_1_label) !== normalizeImportValue(entry.values.purity_1_label) ||
        normalizeMoneyLike(existing.purity_1_price) !== normalizeMoneyLike(entry.values.purity_1_price) ||
        !sameLists(normalizeList(existing.metals_raw), normalizeList([entry.values.metal_1, entry.values.metal_2, entry.values.metal_3]))
      ) {
        changedFields.push('metal_variants')
      }
    }

    if (!sameLists(normalizeList(existing.material_values), normalizeList([entry.values.material_value_1, entry.values.material_value_2, entry.values.material_value_3, entry.values.material_value_4]))) {
      changedFields.push('materials')
    }
    if (expectedStoneShapes.length > 0 && !sameLists(existing.stone_shapes, expectedStoneShapes)) {
      changedFields.push('stone_shapes')
    }

    return {
      ...entry,
      changeType: changedFields.length < 1 ? ('unchanged' as const) : ('updated' as const),
      changedFields,
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
