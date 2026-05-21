import 'server-only'

import { buildAdminClient } from '@/lib/cms-auth'
import { buildNormalizedLookupSet, normalizeImportValue } from '@/lib/import-normalization'
import type { ImportJobIssueRecord, ImportJobRowRecord } from '@/lib/import-jobs'
import { buildCombinedMetalDisplayLabel } from '@/lib/product-metal-variants'

type CatalogLookupSets = {
  categories: Set<string>
  subcategories: Set<string>
  options: Set<string>
  categorySubcategoryPairs: Set<string>
  subcategoryOptionPairs: Set<string>
  styles: Set<string>
  gstSlabs: Set<string>
  metals: Set<string>
  certificates: Set<string>
  materialValues: Set<string>
  shippingRules: Set<string>
  careWarrantyRules: Set<string>
  existingSkus: Set<string>
}

type RowValidationResult = {
  rowId: string
  status: 'validated' | 'warning' | 'error'
  message: string
  issues: Omit<ImportJobIssueRecord, 'id' | 'import_job_row_id'>[]
  normalizedPayload: Record<string, unknown>
}

function normalizeName(value: string | null | undefined) {
  return normalizeImportValue(value)
}

function isHttpUrl(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized.startsWith('http://') || normalized.startsWith('https://')
}

function isDirectMediaReference(value: string | null | undefined) {
  return isHttpUrl(value)
}

function splitFlexibleList(value: string | null | undefined) {
  return (value ?? '')
    .split(/[,\|]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function splitGroupedValues(value: string | null | undefined) {
  return (value ?? '')
    .split(/~~|\|/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function splitMediaReferences(value: string | null | undefined) {
  return (value ?? '')
    .split(/~~|\|/)
    .flatMap((group) => group.split(','))
    .map((entry) => entry.trim())
    .filter((entry) => Boolean(entry) && entry !== '[object Object]')
}

async function loadLookupSets() {
  const adminClient = buildAdminClient()
  if (!adminClient) return null

  const [categories, subcategories, options, styles, gstSlabs, metals, certificates, materialValues, productContentRules, existingProducts] = await Promise.all([
    adminClient.from('catalog_categories').select('id, name'),
    adminClient.from('catalog_subcategories').select('id, name, category_id'),
    adminClient.from('catalog_options').select('name, subcategory_id'),
    adminClient.from('catalog_styles').select('name'),
    adminClient.from('catalog_gst_slabs').select('name'),
    adminClient.from('catalog_metals').select('name, display_label, purity_label, base_metal_name'),
    adminClient.from('catalog_certificates').select('name'),
    adminClient.from('catalog_material_values').select('name'),
    adminClient.from('product_content_rules').select('name, kind'),
    adminClient.from('products').select('sku'),
  ])

  const shippingRules = new Set<string>()
  const careWarrantyRules = new Set<string>()
  for (const row of productContentRules.data ?? []) {
    const normalized = normalizeName(row.name)
    if (!normalized) continue
    if (row.kind === 'shipping') shippingRules.add(normalized)
    if (row.kind === 'care_warranty') careWarrantyRules.add(normalized)
  }

  const categoryNameById = new Map<string, string>(
    (categories.data ?? [])
      .map((row: { id?: string; name: string }) => [String((row as { id?: string }).id ?? ''), normalizeName(row.name)] as const)
      .filter(([, name]) => Boolean(name))
  )

  const subcategoryNameById = new Map<string, string>(
    (subcategories.data ?? [])
      .map((row: { id?: string; name: string }) => [String((row as { id?: string }).id ?? ''), normalizeName(row.name)] as const)
      .filter(([, name]) => Boolean(name))
  )

  const categorySubcategoryPairs = new Set<string>()
  for (const row of (subcategories.data ?? []) as Array<{ name: string; category_id?: string | null }>) {
    const categoryName = categoryNameById.get(String(row.category_id ?? ''))
    const subcategoryName = normalizeName(row.name)
    if (categoryName && subcategoryName) {
      categorySubcategoryPairs.add(`${categoryName}::${subcategoryName}`)
    }
  }

  const subcategoryOptionPairs = new Set<string>()
  for (const row of (options.data ?? []) as Array<{ name: string; subcategory_id?: string | null }>) {
    const subcategoryName = subcategoryNameById.get(String(row.subcategory_id ?? ''))
    const optionName = normalizeName(row.name)
    if (subcategoryName && optionName) {
      subcategoryOptionPairs.add(`${subcategoryName}::${optionName}`)
    }
  }

  return {
    categories: buildNormalizedLookupSet(categories.data as Array<{ name: string }>),
    subcategories: buildNormalizedLookupSet(subcategories.data as Array<{ name: string }>),
    options: buildNormalizedLookupSet(options.data as Array<{ name: string }>),
    categorySubcategoryPairs,
    subcategoryOptionPairs,
    styles: buildNormalizedLookupSet(styles.data as Array<{ name: string }>),
    gstSlabs: buildNormalizedLookupSet(gstSlabs.data as Array<{ name: string }>),
    metals: new Set(
      ((metals.data ?? []) as Array<{ name: string; display_label?: string | null; purity_label?: string | null; base_metal_name?: string | null }>)
        .flatMap((row) => [
          normalizeName(row.name),
          normalizeName(row.display_label),
          normalizeName(buildCombinedMetalDisplayLabel(row)),
        ])
        .filter(Boolean)
    ),
    certificates: buildNormalizedLookupSet(certificates.data as Array<{ name: string }>),
    materialValues: buildNormalizedLookupSet(materialValues.data as Array<{ name: string }>),
    shippingRules,
    careWarrantyRules,
    existingSkus: new Set((existingProducts.data ?? []).map((row: { sku: string }) => normalizeName(row.sku)).filter(Boolean)),
  } satisfies CatalogLookupSets
}

function validateBooleanLike(value: string | null | undefined) {
  if (!value) return null
  const normalized = normalizeName(value)
  if (['true', 'yes', '1'].includes(normalized)) return true
  if (['false', 'no', '0'].includes(normalized)) return false
  return 'invalid'
}

function collectOrderedValues(payload: Record<string, string> | null | undefined, prefix: string, count: number) {
  if (!payload) return []
  return Array.from({ length: count }, (_, index) => payload[`${prefix}_${index + 1}`] ?? '')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function collectSpecifications(payload: Record<string, string> | null | undefined, count: number) {
  if (!payload) return []
  return Array.from({ length: count }, (_, index) => ({
    key: (payload[`spec_${index + 1}_key`] ?? '').trim(),
    value: (payload[`spec_${index + 1}_value`] ?? '').trim(),
  })).filter((entry) => entry.key && entry.value)
}

function validateRow(
  row: ImportJobRowRecord,
  lookups: CatalogLookupSets,
  duplicateSkusInBatch: Set<string>,
  hasArchive: boolean
): RowValidationResult {
  const issues: RowValidationResult['issues'] = []
  const lane = normalizeName(row.lane)
  const category = normalizeName(row.category)
  const subcategory = normalizeName(row.subcategory)
  const option = normalizeName(row.option_name)
  const style = normalizeName(row.style_name)
  const gstSlab = normalizeName(row.gst_slab_name)
  const shippingRule = normalizeName(row.shipping_rule_name)
  const careWarrantyRule = normalizeName(row.care_warranty_rule_name)
  const sku = normalizeName(row.sku)
  const metals = collectOrderedValues(row.raw_payload, 'metal', 3)
  const combinedVariantValues = splitGroupedValues(typeof row.raw_payload?.variant_combined_values === 'string' ? row.raw_payload.variant_combined_values : '')
  const combinedVariantPrices = splitGroupedValues(typeof row.raw_payload?.variant_price_values === 'string' ? row.raw_payload.variant_price_values : '')
  const certificates = collectOrderedValues(row.raw_payload, 'certificate', 2)
  const materialValues = collectOrderedValues(row.raw_payload, 'material_value', 4)
  const specifications = collectSpecifications(row.raw_payload, 4)
  const sourceSubcategoryValues = splitFlexibleList(typeof row.raw_payload?.source_subcategory === 'string' ? row.raw_payload.source_subcategory : row.subcategory)
  const sourceOptionValues = splitFlexibleList(typeof row.raw_payload?.source_option === 'string' ? row.raw_payload.source_option : row.option_name)
  const featured = validateBooleanLike(row.raw_payload?.featured)
  const readyToShip = validateBooleanLike(row.raw_payload?.ready_to_ship)
  const existingChangeType = row.normalized_payload?.change_type
  const existingChangedFields = Array.isArray(row.normalized_payload?.changed_fields)
    ? row.normalized_payload.changed_fields
    : []
  const isIntentionalUpdate = existingChangeType === 'updated'

  const addIssue = (issue_type: 'warning' | 'error', field_name: string | null, issue_code: string, message: string) => {
    issues.push({ issue_type, field_name, issue_code, message })
  }

  if (!sku) addIssue('error', 'sku', 'missing_sku', 'SKU is required.')
  if (!row.product_name?.trim()) addIssue('error', 'product_name', 'missing_product_name', 'Product name is required.')
  if (!lane || !['standard', 'hiphop', 'collection'].includes(lane)) {
    addIssue('error', 'lane', 'invalid_lane', 'Lane must be standard, hiphop, or collection.')
  }
  if (!category) {
    addIssue('error', 'category', 'missing_category', 'Category is required.')
  } else if (!lookups.categories.has(category)) {
    addIssue('error', 'category', 'unknown_category', `Category "${row.category}" does not exist in catalog setup.`)
  }
  if (subcategory && !lookups.subcategories.has(subcategory)) {
    addIssue('error', 'subcategory', 'unknown_subcategory', `Subcategory "${row.subcategory}" does not exist in catalog setup.`)
  } else if (category && subcategory && !lookups.categorySubcategoryPairs.has(`${category}::${subcategory}`)) {
    addIssue('error', 'subcategory', 'invalid_subcategory_for_category', 'Subcategory does not belong to selected main category.')
  }
  for (const sourceSubcategory of sourceSubcategoryValues) {
    const normalizedSourceSubcategory = normalizeName(sourceSubcategory)
    if (!normalizedSourceSubcategory || normalizedSourceSubcategory === subcategory) continue
    if (!lookups.subcategories.has(normalizedSourceSubcategory)) {
      addIssue('warning', 'subcategory', 'unknown_linked_subcategory', `Linked subcategory "${sourceSubcategory}" was not found in catalog setup.`)
    } else if (category && !lookups.categorySubcategoryPairs.has(`${category}::${normalizedSourceSubcategory}`)) {
      addIssue('warning', 'subcategory', 'invalid_linked_subcategory_for_category', `Linked subcategory "${sourceSubcategory}" does not belong to the selected category.`)
    }
  }
  if (option && !lookups.options.has(option)) {
    addIssue('error', 'option_name', 'unknown_option', `Option "${row.option_name}" does not exist in catalog setup.`)
  } else if (subcategory && option && !lookups.subcategoryOptionPairs.has(`${subcategory}::${option}`)) {
    addIssue('error', 'option_name', 'invalid_option_for_subcategory', 'Option does not belong to selected subcategory.')
  }
  for (const sourceOption of sourceOptionValues) {
    const normalizedSourceOption = normalizeName(sourceOption)
    if (!normalizedSourceOption || normalizedSourceOption === option) continue
    if (!lookups.options.has(normalizedSourceOption)) {
      addIssue('warning', 'option_name', 'unknown_linked_option', `Linked option "${sourceOption}" was not found in catalog setup.`)
    }
  }
  if (style && !lookups.styles.has(style)) {
    addIssue('warning', 'style_name', 'unknown_style', `Style "${row.style_name}" was not found and may need manual mapping.`)
  }
  if (!row.description?.trim()) {
    addIssue('error', 'description', 'missing_description', 'Description is required.')
  }
  if (row.stock_quantity == null || Number.isNaN(Number(row.stock_quantity)) || Number(row.stock_quantity) < 0) {
    addIssue('error', 'stock_quantity', 'invalid_stock', 'Stock quantity must be 0 or greater.')
  }
  const hasCombinedVariants = combinedVariantValues.length > 0
  const firstCombinedVariantPrice = Number(combinedVariantPrices[0] ?? '')

  if (!hasCombinedVariants && !row.purity_1_label?.trim()) {
    addIssue('error', 'purity_1_label', 'missing_purity_label', 'The first purity label is required.')
  }
  if (
    hasCombinedVariants
      ? !Number.isFinite(firstCombinedVariantPrice) || firstCombinedVariantPrice <= 0
      : row.purity_1_price == null || Number.isNaN(Number(row.purity_1_price)) || Number(row.purity_1_price) <= 0
  ) {
    addIssue(
      'error',
      hasCombinedVariants ? 'variant_price_values' : 'purity_1_price',
      'invalid_purity_price',
      hasCombinedVariants
        ? 'The first combined metal option price must be greater than 0.'
        : 'The first purity price must be greater than 0.'
    )
  }
  if (!row.image_1?.trim()) {
    addIssue('error', 'image_1', 'missing_primary_image', 'Image 1 is required for every product row.')
  }
  if (gstSlab && !lookups.gstSlabs.has(gstSlab)) {
    addIssue('warning', 'gst_slab_name', 'unknown_gst_slab', `GST slab "${row.gst_slab_name}" was not found.`)
  }
  if (shippingRule && !lookups.shippingRules.has(shippingRule)) {
    addIssue('warning', 'shipping_rule_name', 'unknown_shipping_rule', `Shipping rule "${row.shipping_rule_name}" was not found.`)
  }
  if (careWarrantyRule && !lookups.careWarrantyRules.has(careWarrantyRule)) {
    addIssue('warning', 'care_warranty_rule_name', 'unknown_care_rule', `Care & warranty rule "${row.care_warranty_rule_name}" was not found.`)
  }

  for (const metal of (hasCombinedVariants ? combinedVariantValues : metals)) {
    if (!lookups.metals.has(normalizeName(metal))) {
      addIssue('warning', 'metals_raw', 'unknown_metal', `Metal "${metal}" was not found in catalog setup.`)
    }
  }
  for (const certificate of certificates) {
    if (!lookups.certificates.has(normalizeName(certificate))) {
      addIssue('warning', 'certificates_raw', 'unknown_certificate', `Certificate "${certificate}" was not found in catalog setup.`)
    }
  }
  for (const materialValue of materialValues) {
    if (!lookups.materialValues.has(normalizeName(materialValue))) {
      addIssue('warning', 'material_value_1', 'unknown_material_value', `Material value "${materialValue}" was not found in catalog setup.`)
    }
  }

  if (duplicateSkusInBatch.has(sku)) {
    addIssue('error', 'sku', 'duplicate_sku_in_batch', `SKU "${row.sku}" appears more than once in this import batch.`)
  }
  if (sku && lookups.existingSkus.has(sku) && !isIntentionalUpdate) {
    addIssue('warning', 'sku', 'existing_sku', `SKU "${row.sku}" already exists in the live product catalog and this import will update that product instead of creating a duplicate.`)
  }
  if (featured === 'invalid') {
    addIssue('warning', 'featured', 'invalid_boolean', 'Featured should use TRUE or FALSE.')
  }
  if (readyToShip === 'invalid') {
    addIssue('warning', 'ready_to_ship', 'invalid_boolean', 'Ready To Ship should use TRUE or FALSE.')
  }
  const localMediaReferences = [
    ...splitMediaReferences(row.image_1),
    ...splitMediaReferences(row.image_2),
    ...splitMediaReferences(row.image_3),
    ...splitMediaReferences(row.image_4),
    ...splitMediaReferences(typeof row.raw_payload?.variant_image_group_values === 'string' ? row.raw_payload.variant_image_group_values : ''),
    ...splitMediaReferences(typeof row.raw_payload?.variant_video_group_values === 'string' ? row.raw_payload.variant_video_group_values : ''),
  ]
    .filter((entry) => entry.length > 0 && !isDirectMediaReference(entry))

  if (!hasArchive && (localMediaReferences.length > 0 || (row.video && !isHttpUrl(row.video)))) {
    addIssue('warning', 'image_1', 'missing_archive', 'No ZIP archive has been uploaded yet, so file matching cannot be validated in this phase.')
  }

  const normalizedPayload = {
    lane,
    sku: row.sku,
    product_name: row.product_name,
    category: row.category,
    subcategory: row.subcategory,
    option_name: row.option_name,
    style_name: row.style_name,
    description: row.description,
    tag_line: row.tag_line,
    featured: featured === 'invalid' ? null : featured,
    ready_to_ship: readyToShip === 'invalid' ? null : readyToShip,
    change_type: existingChangeType === 'updated' || existingChangeType === 'new' ? existingChangeType : undefined,
    changed_fields: existingChangedFields,
    stock_quantity: row.stock_quantity,
    discount_price: row.discount_price,
    gst_slab_name: row.gst_slab_name,
    metals,
    certificates,
    material_values: materialValues,
    combined_metal_values: combinedVariantValues,
    combined_metal_prices: combinedVariantPrices,
    purity_prices: hasCombinedVariants
      ? []
      : [
          row.purity_1_label && row.purity_1_price ? { label: row.purity_1_label, price: row.purity_1_price } : null,
          row.purity_2_label && row.purity_2_price ? { label: row.purity_2_label, price: row.purity_2_price } : null,
          row.purity_3_label && row.purity_3_price ? { label: row.purity_3_label, price: row.purity_3_price } : null,
        ].filter(Boolean),
    specifications,
    media: {
      image_1: row.image_1,
      image_2: row.image_2,
      image_3: row.image_3,
      image_4: row.image_4,
      video: row.video,
    },
    shipping_rule_name: row.shipping_rule_name,
    care_warranty_rule_name: row.care_warranty_rule_name,
    engraving_label: row.engraving_label,
  }

  const errorCount = issues.filter((issue) => issue.issue_type === 'error').length
  const warningCount = issues.filter((issue) => issue.issue_type === 'warning').length

  return {
    rowId: row.id,
    status: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'validated',
    message:
      errorCount > 0
        ? `Blocked by ${errorCount} error${errorCount === 1 ? '' : 's'}.`
        : warningCount > 0
          ? `Valid with ${warningCount} warning${warningCount === 1 ? '' : 's'}.`
          : 'Ready for import.',
    issues,
    normalizedPayload,
  }
}

export async function validateImportJob(jobId: string) {
  const adminClient = buildAdminClient()
  if (!adminClient) throw new Error('Admin client is not available.')

  const [{ data: job, error: jobError }, { data: rows, error: rowsError }] = await Promise.all([
    adminClient.from('import_jobs').select('*').eq('id', jobId).single(),
    adminClient.from('import_job_rows').select('*').eq('import_job_id', jobId).order('row_number', { ascending: true }),
  ])

  if (jobError || !job) {
    throw new Error(jobError?.message ?? 'Import job not found.')
  }
  if (rowsError) {
    throw new Error(rowsError.message)
  }

  await adminClient.from('import_jobs').update({ status: 'validating' }).eq('id', jobId)
  await adminClient.from('import_job_row_issues').delete().in('import_job_row_id', ((rows ?? []) as ImportJobRowRecord[]).map((row) => row.id))

  const lookups = await loadLookupSets()
  if (!lookups) {
    throw new Error('Lookup tables could not be loaded for validation.')
  }

  const typedRows = (rows ?? []) as ImportJobRowRecord[]
  const hasArchive = Boolean(job.zip_storage_path)

  const skuCounts = new Map<string, number>()
  for (const row of typedRows) {
    const normalizedSku = normalizeName(row.sku)
    if (!normalizedSku) continue
    skuCounts.set(normalizedSku, (skuCounts.get(normalizedSku) ?? 0) + 1)
  }
  const duplicateSkusInBatch = new Set([...skuCounts.entries()].filter(([, count]) => count > 1).map(([sku]) => sku))

  const results = typedRows.map((row) => validateRow(row, lookups, duplicateSkusInBatch, hasArchive))

  const updates = results.map((result) =>
    adminClient
      .from('import_job_rows')
      .update({
        status: result.status,
        import_message: result.message,
        normalized_payload: result.normalizedPayload,
      })
      .eq('id', result.rowId)
  )
  await Promise.all(updates)

  const issuesPayload = results.flatMap((result) =>
    result.issues.map((issue) => ({
      import_job_row_id: result.rowId,
      issue_type: issue.issue_type,
      field_name: issue.field_name,
      issue_code: issue.issue_code,
      message: issue.message,
    }))
  )
  if (issuesPayload.length > 0) {
    const { error: issuesError } = await adminClient.from('import_job_row_issues').insert(issuesPayload)
    if (issuesError) throw new Error(issuesError.message)
  }

  const validRows = results.filter((result) => result.status === 'validated').length
  const warningRows = results.filter((result) => result.status === 'warning').length
  const errorRows = results.filter((result) => result.status === 'error').length
  const nextStatus = validRows + warningRows > 0 ? 'ready' : 'failed'

  const { error: jobUpdateError } = await adminClient
    .from('import_jobs')
    .update({
      status: nextStatus,
      valid_rows: validRows,
      warning_rows: warningRows,
      error_rows: errorRows,
      notes:
        nextStatus === 'ready'
          ? 'Validation completed. Review row warnings and errors before starting import execution.'
          : 'Validation completed, but no rows are currently eligible for import.',
    })
    .eq('id', jobId)

  if (jobUpdateError) throw new Error(jobUpdateError.message)

  return {
    status: nextStatus,
    validRows,
    warningRows,
    errorRows,
    totalRows: results.length,
  }
}
