import 'server-only'

import JSZip from 'jszip'
import sharp from 'sharp'
import { buildAdminClient } from '@/lib/cms-auth'
import { productImportBucket } from '@/lib/product-import-staging'
import type { ImportJobIssueRecord, ImportJobRowRecord } from '@/lib/import-jobs'
import { uploadProductVideoToR2 } from '@/lib/r2'
import { slugify } from '@/lib/product-catalog'

type LookupRow = { id: string; name: string }
type RuleLookupRow = { id: string; name: string; kind: 'shipping' | 'care_warranty' }

const allowedImageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'])
const allowedVideoExtensions = new Set(['mp4', 'mov', 'webm'])

function normalizeName(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function isHttpUrl(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized.startsWith('http://') || normalized.startsWith('https://')
}

function isMissingProductColumn(error: { message?: string | null } | null | undefined, column: string) {
  return error?.message?.includes(`Could not find the '${column}' column of 'products'`) ?? false
}

function splitPipeList(value: string | null | undefined) {
  return (value ?? '')
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function collectOrderedValues(payload: Record<string, unknown> | null | undefined, prefix: string, count: number) {
  if (!payload) return []
  return Array.from({ length: count }, (_, index) => {
    const value = payload[`${prefix}_${index + 1}`]
    return typeof value === 'string' ? value.trim() : ''
  }).filter(Boolean)
}

function collectSpecifications(payload: Record<string, unknown> | null | undefined, count: number) {
  if (!payload) return []
  return Array.from({ length: count }, (_, index) => {
    const key = typeof payload[`spec_${index + 1}_key`] === 'string' ? String(payload[`spec_${index + 1}_key`]).trim() : ''
    const value = typeof payload[`spec_${index + 1}_value`] === 'string' ? String(payload[`spec_${index + 1}_value`]).trim() : ''
    return { key, value }
  }).filter((entry) => entry.key && entry.value)
}

function fileExtension(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return extension
}

function isBlockingExecutionIssue(issue: ImportJobIssueRecord) {
  return issue.issue_type === 'error' || issue.issue_code === 'missing_archive'
}

async function loadZipEntries(storagePath: string) {
  const adminClient = buildAdminClient()
  if (!adminClient) {
    throw new Error('Admin client is not available.')
  }

  const { data, error } = await adminClient.storage.from(productImportBucket).download(storagePath)
  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to download staged ZIP archive.')
  }

  const zip = await JSZip.loadAsync(Buffer.from(await data.arrayBuffer()))
  const entries = new Map<string, JSZip.JSZipObject>()

  for (const [entryPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const baseName = entryPath.split('/').pop()?.toLowerCase()
    if (!baseName) continue
    if (!entries.has(baseName)) {
      entries.set(baseName, entry)
    }
  }

  return entries
}

async function uploadMediaFromArchiveEntry({
  entry,
  folder,
  fileName,
}: {
  entry: JSZip.JSZipObject
  folder: 'products' | 'hiphop'
  fileName: string
}) {
  const adminClient = buildAdminClient()
  if (!adminClient) {
    throw new Error('Admin client is not available.')
  }

  const extension = fileExtension(fileName)
  const buffer = Buffer.from(await entry.async('nodebuffer'))

  if (allowedImageExtensions.has(extension)) {
    const isSvg = extension === 'svg'
    const storagePath = `${folder}/images/${crypto.randomUUID()}.${isSvg ? 'svg' : 'webp'}`
    const uploadBuffer = isSvg
      ? buffer
      : await sharp(buffer).rotate().resize({ width: 2200, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()

    const { error } = await adminClient.storage.from(productImportBucket).upload(storagePath, uploadBuffer, {
      contentType: isSvg ? 'image/svg+xml' : 'image/webp',
      upsert: false,
    })
    if (error) throw new Error(error.message)
    return { kind: 'image' as const, path: storagePath }
  }

  if (allowedVideoExtensions.has(extension)) {
    const safeExtension = extension || 'mp4'
    const uploadedVideo = await uploadProductVideoToR2({
      buffer,
      extension: safeExtension,
      folder,
      contentType:
        safeExtension === 'mov'
          ? 'video/quicktime'
          : safeExtension === 'webm'
            ? 'video/webm'
            : 'video/mp4',
    })
    return { kind: 'video' as const, path: uploadedVideo.url }
  }

  throw new Error(`Unsupported media file type for ${fileName}.`)
}

async function loadReferenceMaps() {
  const adminClient = buildAdminClient()
  if (!adminClient) throw new Error('Admin client is not available.')

  const [categories, subcategories, options, styles, gstSlabs, metals, certificates, materialValues, rules] = await Promise.all([
    adminClient.from('catalog_categories').select('id, name'),
    adminClient.from('catalog_subcategories').select('id, name'),
    adminClient.from('catalog_options').select('id, name'),
    adminClient.from('catalog_styles').select('id, name'),
    adminClient.from('catalog_gst_slabs').select('id, name'),
    adminClient.from('catalog_metals').select('id, name'),
    adminClient.from('catalog_certificates').select('id, name'),
    adminClient.from('catalog_material_values').select('id, name'),
    adminClient.from('product_content_rules').select('id, name, kind').eq('status', 'active').order('display_order', { ascending: true }),
  ])

  const mapByName = (rows: LookupRow[] | null | undefined) =>
    new Map((rows ?? []).map((row) => [normalizeName(row.name), row]))

  const shippingRuleMap = new Map<string, RuleLookupRow>()
  const careRuleMap = new Map<string, RuleLookupRow>()
  for (const rule of (rules.data ?? []) as RuleLookupRow[]) {
    const key = normalizeName(rule.name)
    if (!key) continue
    if (rule.kind === 'shipping') shippingRuleMap.set(key, rule)
    if (rule.kind === 'care_warranty') careRuleMap.set(key, rule)
  }

  return {
    categoryMap: mapByName(categories.data as LookupRow[]),
    subcategoryMap: mapByName(subcategories.data as LookupRow[]),
    optionMap: mapByName(options.data as LookupRow[]),
    styleMap: mapByName(styles.data as LookupRow[]),
    gstMap: mapByName(gstSlabs.data as LookupRow[]),
    metalMap: mapByName(metals.data as LookupRow[]),
    certificateMap: mapByName(certificates.data as LookupRow[]),
    materialValueMap: mapByName(materialValues.data as LookupRow[]),
    shippingRuleMap,
    careRuleMap,
    defaultShippingRule: (rules.data as RuleLookupRow[] | null | undefined)?.find((rule) => rule.kind === 'shipping') ?? null,
    defaultCareRule: (rules.data as RuleLookupRow[] | null | undefined)?.find((rule) => rule.kind === 'care_warranty') ?? null,
  }
}

async function replaceProductMetalSelections(adminClient: any, productId: string, metalIds: string[]) {
  await adminClient.from('product_metal_selections').delete().eq('product_id', productId)

  if (metalIds.length < 1) return

  const { error } = await adminClient.from('product_metal_selections').insert(
    metalIds.map((metalId, index) => ({ product_id: productId, metal_id: metalId, sort_order: index + 1 }))
  )
  if (error) throw new Error(error.message)
}

async function replaceProductMaterialValueSelections(adminClient: any, productId: string, materialValueIds: string[]) {
  await adminClient.from('product_material_value_selections').delete().eq('product_id', productId)

  if (materialValueIds.length < 1) return

  const { error } = await adminClient.from('product_material_value_selections').insert(
    materialValueIds.map((materialValueId, index) => ({
      product_id: productId,
      material_value_id: materialValueId,
      sort_order: index + 1,
    }))
  )
  if (error) throw new Error(error.message)
}

async function replaceProductPurityPrices(
  adminClient: any,
  productId: string,
  purityRows: Array<{ purity_label: string; price: number; sort_order: number }>
) {
  await adminClient.from('product_purity_prices').delete().eq('product_id', productId)

  if (purityRows.length < 1) {
    await adminClient.from('products').update({ default_purity_price_id: null }).eq('id', productId)
    return
  }

  const { data: insertedPurities, error } = await adminClient
    .from('product_purity_prices')
    .insert(
      purityRows.map((entry) => ({
        product_id: productId,
        purity_label: entry.purity_label,
        price: entry.price,
        compare_at_price: null,
        sort_order: entry.sort_order,
      }))
    )
    .select('id')

  if (error) throw new Error(error.message)

  const defaultPurityId = insertedPurities?.[0]?.id ?? null
  await adminClient.from('products').update({ default_purity_price_id: defaultPurityId }).eq('id', productId)
}

async function saveProduct(adminClient: any, row: ImportJobRowRecord, mediaPaths: { image_1_path: string; image_2_path: string | null; image_3_path: string | null; image_4_path: string | null; video_path: string | null }) {
  const refs = await loadReferenceMaps()
  const normalized = (row.normalized_payload ?? {}) as Record<string, unknown>
  const lane = normalizeName((normalized.lane as string | null | undefined) ?? row.lane) || 'standard'
  const metals = Array.isArray(normalized.metals) ? normalized.metals.filter((entry): entry is string => typeof entry === 'string') : splitPipeList(row.metals_raw)
  const certificates = Array.isArray(normalized.certificates) ? normalized.certificates.filter((entry): entry is string => typeof entry === 'string') : splitPipeList(row.certificates_raw)
  const materialValues = Array.isArray(normalized.material_values) ? normalized.material_values.filter((entry): entry is string => typeof entry === 'string') : collectOrderedValues(row.raw_payload ?? {}, 'material_value', 4)
  const specifications = Array.isArray(normalized.specifications)
    ? normalized.specifications
        .filter((entry): entry is { key: string; value: string } => typeof entry === 'object' && entry !== null && typeof (entry as { key?: unknown }).key === 'string' && typeof (entry as { value?: unknown }).value === 'string')
        .map((entry) => ({ key: entry.key.trim(), value: entry.value.trim() }))
        .filter((entry) => entry.key && entry.value)
    : collectSpecifications(row.raw_payload ?? {}, 4)

  const mainCategory = refs.categoryMap.get(normalizeName(row.category))
  if (!mainCategory) {
    throw new Error(`Category "${row.category}" could not be resolved during execution.`)
  }

  const subcategory = refs.subcategoryMap.get(normalizeName(row.subcategory))
  const option = refs.optionMap.get(normalizeName(row.option_name))
  const style = refs.styleMap.get(normalizeName(row.style_name))
  const gst = refs.gstMap.get(normalizeName(row.gst_slab_name))
  const shippingRule = refs.shippingRuleMap.get(normalizeName(row.shipping_rule_name)) ?? refs.defaultShippingRule
  const careRule = refs.careRuleMap.get(normalizeName(row.care_warranty_rule_name)) ?? refs.defaultCareRule

  const purityRows = [
    row.purity_1_label && row.purity_1_price ? { id: `import-1-${row.id}`, purity_label: row.purity_1_label, price: row.purity_1_price, sort_order: 1 } : null,
    row.purity_2_label && row.purity_2_price ? { id: `import-2-${row.id}`, purity_label: row.purity_2_label, price: row.purity_2_price, sort_order: 2 } : null,
    row.purity_3_label && row.purity_3_price ? { id: `import-3-${row.id}`, purity_label: row.purity_3_label, price: row.purity_3_price, sort_order: 3 } : null,
  ].filter(Boolean) as Array<{ id: string; purity_label: string; price: number; sort_order: number }>

  const payload = {
    name: row.product_name,
    sku: row.sku,
    product_lane: lane === 'hiphop' ? 'hiphop' : lane === 'collection' ? 'collection' : 'standard',
    detail_template: lane === 'hiphop' ? 'hiphop' : 'standard',
    main_category_id: mainCategory.id,
    subcategory_id: subcategory?.id ?? null,
    option_id: option?.id ?? null,
    style_id: style?.id ?? null,
    description: row.description ?? null,
    tag_line: null,
    base_price: row.purity_1_price ?? null,
    discount_price: row.discount_price ?? null,
    gst_slab_id: gst?.id ?? null,
    featured: false,
    status: 'draft',
    stock_quantity: Math.max(0, Number(row.stock_quantity ?? 0)),
    allow_checkout: false,
    ready_to_ship: false,
    features: [],
    purity_values: purityRows.map((entry) => entry.purity_label),
    certificate_ids: certificates
      .map((name) => refs.certificateMap.get(normalizeName(name))?.id)
      .filter((id): id is string => Boolean(id)),
    ring_size_ids: [],
    ring_enabled: false,
    ring_category_id: null,
    fit_options: [],
    fit_label: null,
    gemstone_label: null,
    gemstone_value: null,
    shapes_enabled: false,
    show_purity: true,
    engraving_enabled: Boolean(row.engraving_label?.trim()),
    engraving_label: row.engraving_label?.trim() || null,
    shipping_rule_id: shippingRule?.id ?? null,
    care_warranty_rule_id: careRule?.id ?? null,
    shipping_enabled: Boolean(shippingRule),
    care_warranty_enabled: Boolean(careRule),
    shipping_override_enabled: false,
    care_warranty_override_enabled: false,
    shipping_title_override: null,
    shipping_body_override: null,
    care_warranty_title_override: null,
    care_warranty_body_override: null,
    specifications: specifications.map((entry) => ({ key: entry.key, value: entry.value })),
    product_details: [],
    detail_sections: [],
    image_1_path: mediaPaths.image_1_path,
    image_2_path: mediaPaths.image_2_path,
    image_3_path: mediaPaths.image_3_path,
    image_4_path: mediaPaths.image_4_path,
    video_path: mediaPaths.video_path,
    show_image_1: true,
    show_image_2: Boolean(mediaPaths.image_2_path),
    show_image_3: Boolean(mediaPaths.image_3_path),
    show_image_4: Boolean(mediaPaths.image_4_path),
    show_video: Boolean(mediaPaths.video_path),
    custom_order_enabled: false,
    hiphop_badges: [],
    chain_length_options: [],
    hiphop_carat_label: null,
    hiphop_carat_values: [],
    gram_weight_label: null,
    gram_weight_value: null,
  }

  const { data: existingProduct, error: existingProductError } = await adminClient
    .from('products')
    .select('id, slug')
    .eq('sku', row.sku)
    .maybeSingle()

  if (existingProductError) {
    throw new Error(existingProductError.message)
  }

  const writePayload = existingProduct
    ? payload
    : {
        slug: `${slugify(row.product_name || row.sku || 'import-product')}-${Date.now()}`,
        ...payload,
      }

  let product: { id: string } | null = null
  let productError: { message?: string | null } | null = null

  if (existingProduct) {
    const updatePayload = { ...writePayload }
    delete (updatePayload as Record<string, unknown>).sku

    const updateResult = await adminClient.from('products').update(updatePayload).eq('id', existingProduct.id).select('id').single()
    product = updateResult.data
    productError = updateResult.error

    if (productError && isMissingProductColumn(productError, 'gemstone_value')) {
      const retryPayload = { ...updatePayload }
      delete (retryPayload as Record<string, unknown>).gemstone_value
      const retryResult = await adminClient.from('products').update(retryPayload).eq('id', existingProduct.id).select('id').single()
      product = retryResult.data
      productError = retryResult.error
    }
  } else {
    const insertResult = await adminClient.from('products').insert(writePayload).select('id').single()
    product = insertResult.data
    productError = insertResult.error

    if (productError && isMissingProductColumn(productError, 'gemstone_value')) {
      const retryPayload = { ...writePayload }
      delete (retryPayload as Record<string, unknown>).gemstone_value
      const retryResult = await adminClient.from('products').insert(retryPayload).select('id').single()
      product = retryResult.data
      productError = retryResult.error
    }
  }

  if (productError || !product) {
    throw new Error(productError?.message ?? `Unable to ${existingProduct ? 'update' : 'insert'} product.`)
  }

  const metalIds = metals
    .map((name) => refs.metalMap.get(normalizeName(name))?.id)
    .filter((id): id is string => Boolean(id))
  const materialValueIds = materialValues
    .map((name) => refs.materialValueMap.get(normalizeName(name))?.id)
    .filter((id): id is string => Boolean(id))

  await replaceProductMetalSelections(adminClient, product.id, metalIds)
  await replaceProductMaterialValueSelections(adminClient, product.id, materialValueIds)
  await replaceProductPurityPrices(
    adminClient,
    product.id,
    purityRows.map((entry) => ({
      purity_label: entry.purity_label,
      price: entry.price,
      sort_order: entry.sort_order,
    }))
  )

  return {
    id: product.id as string,
    mode: existingProduct ? 'updated' as const : 'created' as const,
  }
}

function issuePayload(rowId: string, issue_type: 'warning' | 'error', issue_code: string, message: string, field_name: string | null = null) {
  return {
    import_job_row_id: rowId,
    issue_type,
    issue_code,
    message,
    field_name,
  }
}

export async function executeImportJob(jobId: string) {
  const adminClient = buildAdminClient()
  if (!adminClient) throw new Error('Admin client is not available.')

  const [{ data: job, error: jobError }, { data: rows, error: rowsError }, { data: issues, error: issuesError }] = await Promise.all([
    adminClient.from('import_jobs').select('*').eq('id', jobId).single(),
    adminClient.from('import_job_rows').select('*').eq('import_job_id', jobId).order('row_number', { ascending: true }),
    adminClient
      .from('import_job_row_issues')
      .select('*')
      .in(
        'import_job_row_id',
        (
          await adminClient.from('import_job_rows').select('id').eq('import_job_id', jobId)
        ).data?.map((row: { id: string }) => row.id) ?? []
      ),
  ])

  if (jobError || !job) throw new Error(jobError?.message ?? 'Import job not found.')
  if (rowsError) throw new Error(rowsError.message)
  if (!job.zip_storage_path) {
    throw new Error('A staged ZIP archive is required before import execution can safely process product media.')
  }
  if (job.status !== 'ready') {
    throw new Error('Only validated jobs in ready status can be executed.')
  }

  await adminClient.from('import_jobs').update({ status: 'importing', started_at: new Date().toISOString() }).eq('id', jobId)

  const issueMap = new Map<string, ImportJobIssueRecord[]>()
  if (!issuesError) {
    for (const issue of (issues ?? []) as ImportJobIssueRecord[]) {
      issueMap.set(issue.import_job_row_id, [...(issueMap.get(issue.import_job_row_id) ?? []), issue])
    }
  }

  const zipEntries = await loadZipEntries(job.zip_storage_path)
  const typedRows = ((rows ?? []) as ImportJobRowRecord[]).map((row) => ({
    ...row,
    issues: issueMap.get(row.id) ?? [],
  }))

  let importedRows = 0
  let skippedRows = 0

  for (const row of typedRows) {
    const blockingIssues = (row.issues ?? []).filter(isBlockingExecutionIssue)
    if (blockingIssues.length > 0) {
      skippedRows += 1
      await adminClient
        .from('import_job_rows')
        .update({
          status: 'skipped',
          import_message: 'Skipped because blocking validation issues must be resolved first.',
        })
        .eq('id', row.id)
      continue
    }

    try {
      const lane = normalizeName(row.lane) === 'hiphop' ? 'hiphop' : 'products'
      const mediaNames = {
        image_1: row.image_1?.trim() || null,
        image_2: row.image_2?.trim() || null,
        image_3: row.image_3?.trim() || null,
        image_4: row.image_4?.trim() || null,
        video: row.video?.trim() || null,
      }

      if (!mediaNames.image_1) {
        throw new Error('Primary image file name is missing.')
      }

      const resolvedMedia: Record<string, string | null> = {
        image_1_path: null,
        image_2_path: null,
        image_3_path: null,
        image_4_path: null,
        video_path: null,
      }

      for (const [key, fileName] of Object.entries(mediaNames)) {
        if (!fileName) continue
        if (key === 'video' && isHttpUrl(fileName)) {
          resolvedMedia.video_path = fileName
          continue
        }
        const entry = zipEntries.get(fileName.toLowerCase())
        if (!entry) {
          throw new Error(`File "${fileName}" was not found inside the staged ZIP archive.`)
        }

        const uploadResult = await uploadMediaFromArchiveEntry({
          entry,
          folder: lane === 'hiphop' ? 'hiphop' : 'products',
          fileName,
        })

        if (key === 'video') {
          resolvedMedia.video_path = uploadResult.path
        } else {
          resolvedMedia[`${key}_path`] = uploadResult.path
        }
      }

      if (!resolvedMedia.image_1_path) {
        throw new Error('Primary image could not be uploaded during execution.')
      }

      const saveResult = await saveProduct(adminClient, row, resolvedMedia as {
        image_1_path: string
        image_2_path: string | null
        image_3_path: string | null
        image_4_path: string | null
        video_path: string | null
      })

      importedRows += 1
      await adminClient
        .from('import_job_rows')
        .update({
          status: 'imported',
          import_message:
            saveResult.mode === 'updated'
              ? 'Updated existing product from this import row and refreshed media in draft status.'
              : 'Imported successfully as a draft product.',
        })
        .eq('id', row.id)
    } catch (error) {
      skippedRows += 1
      const message = error instanceof Error ? error.message : 'Execution failed for this row.'
      await adminClient.from('import_job_rows').update({ status: 'skipped', import_message: message }).eq('id', row.id)
      await adminClient.from('import_job_row_issues').insert([
        issuePayload(row.id, 'error', 'execution_failed', message, null),
      ])
    }
  }

  const finalStatus = skippedRows > 0 ? 'completed_with_errors' : 'completed'
  const { error: updateError } = await adminClient
    .from('import_jobs')
    .update({
      status: finalStatus,
      imported_rows: importedRows,
      skipped_rows: skippedRows,
      finished_at: new Date().toISOString(),
      notes:
        finalStatus === 'completed'
          ? 'Import execution finished successfully. Imported products were created in draft status for safe review.'
          : 'Import execution finished with skipped rows. Review row issues before retrying or completing the remaining products.',
    })
    .eq('id', jobId)

  if (updateError) throw new Error(updateError.message)

  await adminClient.from('import_job_events').insert([
    {
      import_job_id: jobId,
      event_type: 'execution_completed',
      message: `Imported ${importedRows} row(s) and skipped ${skippedRows} row(s).`,
      meta: { importedRows, skippedRows, finalStatus },
    },
  ])

  return {
    status: finalStatus,
    importedRows,
    skippedRows,
  }
}

export async function resetSkippedRowsForRetry(jobId: string) {
  const adminClient = buildAdminClient()
  if (!adminClient) throw new Error('Admin client is not available.')

  const [{ data: job, error: jobError }, { data: rows, error: rowsError }, { data: issues, error: issuesError }] = await Promise.all([
    adminClient.from('import_jobs').select('*').eq('id', jobId).single(),
    adminClient.from('import_job_rows').select('*').eq('import_job_id', jobId),
    adminClient
      .from('import_job_row_issues')
      .select('*')
      .in(
        'import_job_row_id',
        (
          await adminClient.from('import_job_rows').select('id').eq('import_job_id', jobId)
        ).data?.map((row: { id: string }) => row.id) ?? []
      ),
  ])

  if (jobError || !job) throw new Error(jobError?.message ?? 'Import job not found.')
  if (rowsError) throw new Error(rowsError.message)
  if (issuesError) throw new Error(issuesError.message)

  const skippedRows = ((rows ?? []) as ImportJobRowRecord[]).filter((row) => row.status === 'skipped')
  if (skippedRows.length === 0) {
    return { resetRows: 0, blockedRows: 0, status: job.status }
  }

  const issuesByRow = new Map<string, ImportJobIssueRecord[]>()
  for (const issue of (issues ?? []) as ImportJobIssueRecord[]) {
    issuesByRow.set(issue.import_job_row_id, [...(issuesByRow.get(issue.import_job_row_id) ?? []), issue])
  }

  let resetRows = 0
  let blockedRows = 0

  for (const row of skippedRows) {
    const rowIssues = issuesByRow.get(row.id) ?? []
    const executionIssues = rowIssues.filter((issue) => issue.issue_code === 'execution_failed')
    const remainingIssues = rowIssues.filter((issue) => issue.issue_code !== 'execution_failed')
    const blockingRemainingIssues = remainingIssues.filter(isBlockingExecutionIssue)

    if (executionIssues.length === 0 || blockingRemainingIssues.length > 0) {
      blockedRows += 1
      continue
    }

    if (executionIssues.length > 0) {
      await adminClient.from('import_job_row_issues').delete().in('id', executionIssues.map((issue) => issue.id))
    }

    const nextStatus =
      remainingIssues.some((issue) => issue.issue_type === 'error')
        ? 'error'
        : remainingIssues.some((issue) => issue.issue_type === 'warning')
          ? 'warning'
          : 'validated'

    const nextMessage =
      nextStatus === 'validated'
        ? 'Reset for retry. Row is ready for import execution again.'
        : nextStatus === 'warning'
          ? 'Reset for retry. Row still has warnings but can be executed.'
          : 'Reset attempted, but row still has blocking validation issues.'

    await adminClient
      .from('import_job_rows')
      .update({
        status: nextStatus,
        import_message: nextMessage,
      })
      .eq('id', row.id)

    resetRows += 1
  }

  const { data: refreshedRows, error: refreshedRowsError } = await adminClient.from('import_job_rows').select('status').eq('import_job_id', jobId)
  if (refreshedRowsError) throw new Error(refreshedRowsError.message)

  const statusCounts = (refreshedRows ?? []).reduce(
    (acc, row: { status: string }) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const nextJobStatus =
    (statusCounts.validated ?? 0) + (statusCounts.warning ?? 0) > 0
      ? 'ready'
      : (statusCounts.imported ?? 0) > 0
        ? 'completed_with_errors'
        : 'failed'

  const { error: jobUpdateError } = await adminClient
    .from('import_jobs')
    .update({
      status: nextJobStatus,
      skipped_rows: statusCounts.skipped ?? 0,
      notes:
        resetRows > 0
          ? 'Some skipped rows were reset for retry. Review the row list and run import again when ready.'
          : 'Skipped rows could not be reset because blocking validation issues still remain.',
    })
    .eq('id', jobId)

  if (jobUpdateError) throw new Error(jobUpdateError.message)

  await adminClient.from('import_job_events').insert([
    {
      import_job_id: jobId,
      event_type: 'retry_reset',
      message: `Reset ${resetRows} skipped row(s) for retry and left ${blockedRows} row(s) blocked.`,
      meta: { resetRows, blockedRows, nextJobStatus },
    },
  ])

  return {
    resetRows,
    blockedRows,
    status: nextJobStatus,
  }
}
