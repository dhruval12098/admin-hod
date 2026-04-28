import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import type {
  CatalogCategory,
  CatalogCertificate,
  CatalogGstSlab,
  CatalogMetal,
  CatalogOption,
  ProductMetalMedia,
  ProductPurityPrice,
  CatalogRingCategory,
  CatalogRingCategorySize,
  CatalogStoneShape,
  CatalogStyle,
  CatalogSubcategory,
  ProductDetailSection,
  ProductKeyValue,
  ProductRecord,
} from '@/lib/product-catalog'
import { formatCategoryPath, slugify } from '@/lib/product-catalog'

function isMissingStyleIdColumn(error: { message?: string | null } | null | undefined) {
  return error?.message?.includes("Could not find the 'style_id' column of 'products'") ?? false
}

function isMissingProductColumn(error: { message?: string | null } | null | undefined, column: string) {
  return error?.message?.includes(`Could not find the '${column}' column of 'products'`) ?? false
}

function isMissingRelation(error: { message?: string | null } | null | undefined, table: string) {
  return (
    error?.message?.includes(`relation "${table}" does not exist`) ||
    error?.message?.includes(`Could not find the table 'public.${table}' in the schema cache`)
  ) ?? false
}

function isUuidLike(value: string | null | undefined) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function replaceProductPurityPrices(adminClient: any, productId: string, purityPrices: ProductPurityPrice[], defaultPurityPriceId?: string | null) {
  const normalizedRows = purityPrices
    .map((row, index) => ({
      id: row.id,
      product_id: productId,
      purity_label: row.purity_label.trim(),
      price: Number(row.price ?? 0),
      compare_at_price: row.compare_at_price == null || row.compare_at_price === 0 ? null : Number(row.compare_at_price),
      sort_order: row.sort_order ?? index + 1,
    }))
    .filter((row) => row.purity_label.length > 0)

  const existingResult = await adminClient.from('product_purity_prices').select('id').eq('product_id', productId)
  if (existingResult.error && !isMissingRelation(existingResult.error, 'product_purity_prices')) {
    return { error: existingResult.error }
  }
  const existingIds = new Set<string>((existingResult.data ?? []).map((row: { id: string }) => row.id))

  const keepIds = new Set<string>(normalizedRows.map((row) => row.id).filter((id): id is string => typeof id === 'string' && id.length > 0))
  const deleteIds = [...existingIds].filter((id) => !keepIds.has(id))
  if (deleteIds.length > 0) {
    const deleteResult = await adminClient.from('product_purity_prices').delete().in('id', deleteIds)
    if (deleteResult.error) return { error: deleteResult.error }
  }

  const resolvedIdMap = new Map<string, string>()
  for (const row of normalizedRows) {
    if (row.id && existingIds.has(row.id)) {
      const updateResult = await adminClient
        .from('product_purity_prices')
        .update({
          purity_label: row.purity_label,
          price: row.price,
          compare_at_price: row.compare_at_price,
          sort_order: row.sort_order,
        })
        .eq('id', row.id)
        .select('id')
        .single()
      if (updateResult.error) return { error: updateResult.error }
      resolvedIdMap.set(row.id, updateResult.data.id)
    } else {
      const insertResult = await adminClient
        .from('product_purity_prices')
        .insert({
          product_id: productId,
          purity_label: row.purity_label,
          price: row.price,
          compare_at_price: row.compare_at_price,
          sort_order: row.sort_order,
        })
        .select('id')
        .single()
      if (insertResult.error) return { error: insertResult.error }
      if (row.id) resolvedIdMap.set(row.id, insertResult.data.id)
    }
  }

  const fallbackDefaultId = normalizedRows[0]?.id ? resolvedIdMap.get(normalizedRows[0].id) ?? null : null
  const resolvedCandidateId = defaultPurityPriceId ? resolvedIdMap.get(defaultPurityPriceId) ?? defaultPurityPriceId : fallbackDefaultId
  const resolvedDefaultId = isUuidLike(resolvedCandidateId) ? resolvedCandidateId : fallbackDefaultId
  const productUpdateResult = await adminClient
    .from('products')
    .update({ default_purity_price_id: resolvedDefaultId ?? null })
    .eq('id', productId)
  if (productUpdateResult.error && !isMissingProductColumn(productUpdateResult.error, 'default_purity_price_id')) {
    return { error: productUpdateResult.error }
  }

  return { defaultPurityPriceId: resolvedDefaultId ?? null }
}

async function replaceProductMetalMedia(adminClient: any, productId: string, metalMedia: ProductMetalMedia[]) {
  const existingResult = await adminClient.from('product_metal_media').select('id, metal_id').eq('product_id', productId)
  if (existingResult.error && !isMissingRelation(existingResult.error, 'product_metal_media')) {
    return { error: existingResult.error }
  }

  const existingByMetalId = new Map((existingResult.data ?? []).map((row: { id: string; metal_id: string }) => [row.metal_id, row.id]))
  const nextRows = metalMedia
    .map((row) => ({
      metal_id: row.metal_id,
      image_1_path: row.image_1_path ?? null,
      image_2_path: row.image_2_path ?? null,
      image_3_path: row.image_3_path ?? null,
      image_4_path: row.image_4_path ?? null,
      video_path: row.video_path ?? null,
      is_default_fallback: Boolean(row.is_default_fallback),
    }))
    .filter((row) => row.metal_id)

  const nextMetalIds = new Set(nextRows.map((row) => row.metal_id))
  const deleteIds = (existingResult.data ?? [])
    .filter((row: { metal_id: string }) => !nextMetalIds.has(row.metal_id))
    .map((row: { id: string }) => row.id)

  if (deleteIds.length > 0) {
    const deleteResult = await adminClient.from('product_metal_media').delete().in('id', deleteIds)
    if (deleteResult.error) return { error: deleteResult.error }
  }

  for (const row of nextRows) {
    const existingId = existingByMetalId.get(row.metal_id)
    if (existingId) {
      const updateResult = await adminClient
        .from('product_metal_media')
        .update(row)
        .eq('id', existingId)
      if (updateResult.error) return { error: updateResult.error }
    } else {
      const insertResult = await adminClient
        .from('product_metal_media')
        .insert({ product_id: productId, ...row })
      if (insertResult.error) return { error: insertResult.error }
    }
  }

  return { ok: true }
}

function buildProductWritePayload(body: ProductPayload, includeStyleId = true) {
  const payload: Record<string, unknown> = {
    name: body.name,
    sku: body.sku,
    product_lane: body.product_lane ?? 'standard',
    detail_template: body.detail_template ?? 'standard',
    main_category_id: body.main_category_id,
    subcategory_id: body.subcategory_id,
    option_id: body.option_id,
    description: body.description,
    tag_line: body.tag_line,
    base_price: body.base_price,
    discount_price: body.discount_price,
    gst_slab_id: body.gst_slab_id ?? null,
    stock_quantity: Math.max(0, Number(body.stock_quantity ?? 0)),
    allow_checkout: body.allow_checkout ?? false,
    featured: body.featured,
    status: body.status || 'draft',
    features: body.features ?? [],
    purity_values: body.purity_values ?? [],
    certificate_ids: body.certificate_ids ?? [],
    ring_size_ids: body.ring_size_ids ?? [],
    ring_enabled: body.ring_enabled ?? false,
    ring_category_id: body.ring_enabled ? body.ring_category_id ?? null : null,
    fit_options: body.fit_options ?? [],
    fit_label: body.fit_label,
    gemstone_label: body.gemstone_label,
    gemstone_value: body.gemstone_value,
    shapes_enabled: body.shapes_enabled ?? false,
    show_purity: body.show_purity,
    engraving_enabled: body.engraving_enabled,
    engraving_label: body.engraving_label,
    shipping_rule_id: body.shipping_rule_id,
    care_warranty_rule_id: body.care_warranty_rule_id,
    shipping_enabled: body.shipping_enabled,
    care_warranty_enabled: body.care_warranty_enabled,
    shipping_override_enabled: body.shipping_override_enabled ?? false,
    care_warranty_override_enabled: body.care_warranty_override_enabled ?? false,
    shipping_title_override: body.shipping_title_override,
    shipping_body_override: body.shipping_body_override,
    care_warranty_title_override: body.care_warranty_title_override,
    care_warranty_body_override: body.care_warranty_body_override,
    specifications: body.specifications ?? [],
    product_details: body.product_details ?? [],
    detail_sections: body.detail_sections ?? [],
    image_1_path: body.image_1_path ?? null,
    image_2_path: body.image_2_path ?? null,
    image_3_path: body.image_3_path ?? null,
    image_4_path: body.image_4_path ?? null,
    video_path: body.video_path ?? null,
    show_image_1: body.show_image_1 ?? true,
    show_image_2: body.show_image_2 ?? true,
    show_image_3: body.show_image_3 ?? true,
    show_image_4: body.show_image_4 ?? true,
    show_video: body.show_video ?? true,
    custom_order_enabled: body.custom_order_enabled ?? false,
    ready_to_ship: body.ready_to_ship ?? false,
    hiphop_badges: body.hiphop_badges ?? [],
    chain_length_options: body.chain_length_options ?? [],
    hiphop_carat_label: body.hiphop_carat_label ?? null,
    hiphop_carat_values: body.hiphop_carat_values ?? [],
    gram_weight_label: body.gram_weight_label ?? null,
    gram_weight_value: body.gram_weight_value ?? null,
  }

  if (includeStyleId) {
    payload.style_id = body.style_id ?? null
  }

  return payload
}

type ProductPayload = {
  name: string
  sku: string
  product_lane?: 'standard' | 'hiphop' | 'collection'
  detail_template?: 'standard' | 'hiphop'
  featured: boolean
  description: string | null
  tag_line: string | null
  base_price: number | null
  discount_price: number | null
  gst_slab_id?: string | null
  stock_quantity?: number | null
  allow_checkout?: boolean | null
  status: string
  main_category_id: string
  subcategory_id: string | null
  option_id: string | null
  style_id?: string | null
  metal_ids: string[]
  purity_values: string[]
  purity_prices?: ProductPurityPrice[]
  default_purity_price_id?: string | null
  metal_media?: ProductMetalMedia[]
  certificate_ids: string[]
  ring_size_ids: string[]
  ring_enabled?: boolean
  ring_category_id?: string | null
  fit_options: string[]
  fit_label: string | null
  gemstone_label: string | null
  gemstone_value: string | null
  shapes_enabled?: boolean
  shape_ids?: string[]
  show_purity: boolean
  engraving_enabled: boolean
  engraving_label: string | null
  shipping_rule_id: string | null
  care_warranty_rule_id: string | null
  shipping_enabled: boolean
  care_warranty_enabled: boolean
  shipping_override_enabled?: boolean
  care_warranty_override_enabled?: boolean
  shipping_title_override: string | null
  shipping_body_override: string | null
  care_warranty_title_override: string | null
  care_warranty_body_override: string | null
  features: string[]
  specifications: ProductKeyValue[]
  product_details: ProductKeyValue[]
  detail_sections: ProductDetailSection[]
  image_1_path?: string | null
  image_2_path?: string | null
  image_3_path?: string | null
  image_4_path?: string | null
  video_path?: string | null
  show_image_1?: boolean
  show_image_2?: boolean
  show_image_3?: boolean
  show_image_4?: boolean
  show_video?: boolean
  custom_order_enabled?: boolean
  ready_to_ship?: boolean
  hiphop_badges?: string[]
  chain_length_options?: string[]
  hiphop_carat_label?: string | null
  hiphop_carat_values?: string[]
  gram_weight_label?: string | null
  gram_weight_value?: string | null
}

type RelatedNameRow = { name?: string | null } | Array<{ name?: string | null }> | null

function extractRelatedName(value: RelatedNameRow) {
  return Array.isArray(value) ? value[0]?.name ?? null : value?.name ?? null
}

async function loadCatalog(adminClient: any) {
  const [categoriesResult, subcategoriesResult, optionsResult, metalsResult, shapesResult, certificatesResult, ringCategoriesResult, ringCategorySizesResult, stylesResult, gstSlabsResult] = await Promise.all([
    adminClient.from('catalog_categories').select('*'),
    adminClient.from('catalog_subcategories').select('*'),
    adminClient.from('catalog_options').select('*'),
    adminClient.from('catalog_metals').select('*'),
    adminClient.from('catalog_stone_shapes').select('*'),
    adminClient.from('catalog_certificates').select('*'),
    adminClient.from('catalog_ring_categories').select('*'),
    adminClient.from('catalog_ring_category_sizes').select('*'),
    adminClient.from('catalog_styles').select('*'),
    adminClient.from('catalog_gst_slabs').select('*'),
  ])

  return {
    categories: (categoriesResult.data ?? []) as CatalogCategory[],
    subcategories: (subcategoriesResult.data ?? []) as CatalogSubcategory[],
    options: (optionsResult.data ?? []) as CatalogOption[],
    metals: (metalsResult.data ?? []) as CatalogMetal[],
    shapes: (shapesResult.data ?? []) as CatalogStoneShape[],
    certificates: certificatesResult.error ? ([] as CatalogCertificate[]) : ((certificatesResult.data ?? []) as CatalogCertificate[]),
    ringCategories: ringCategoriesResult.error ? ([] as CatalogRingCategory[]) : ((ringCategoriesResult.data ?? []) as CatalogRingCategory[]),
    ringCategorySizes: ringCategorySizesResult.error ? ([] as CatalogRingCategorySize[]) : ((ringCategorySizesResult.data ?? []) as CatalogRingCategorySize[]),
    styles: stylesResult.error ? ([] as CatalogStyle[]) : ((stylesResult.data ?? []) as CatalogStyle[]),
    gstSlabs: gstSlabsResult.error ? ([] as CatalogGstSlab[]) : ((gstSlabsResult.data ?? []) as CatalogGstSlab[]),
  }
}

function formatProductListItem(
  product: ProductRecord,
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
  metalNames: string[]
) {
  const category = catalog.categories.find((item) => item.id === product.main_category_id)
  const subcategory = catalog.subcategories.find((item) => item.id === product.subcategory_id)
  const option = catalog.options.find((item) => item.id === product.option_id)
  const certificateNames = catalog.certificates
    .filter((item) => (product.certificate_ids ?? []).includes(item.id))
    .map((item) => item.name)
  const ringCategory = catalog.ringCategories.find((item) => item.id === product.ring_category_id)
  const gstSlab = catalog.gstSlabs.find((item) => item.id === product.gst_slab_id)

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
    gstName: gstSlab?.name ?? '',
    gstPercentage: gstSlab?.percentage ?? 0,
    featured: product.featured,
    status: product.status,
    purities: product.purity_values ?? [],
    certificates: certificateNames,
    metals: metalNames,
    ringEnabled: Boolean(product.ring_enabled),
    ringCategoryName: ringCategory?.name ?? '',
  }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { data: products, error } = await adminClient.from('products').select('*').order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const productIds = (products ?? []).map((product) => product.id)
  const [metalSelections, shapeSelections, catalog] = await Promise.all([
    productIds.length
      ? adminClient.from('product_metal_selections').select('product_id, metal:catalog_metals(name)').in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? adminClient.from('product_stone_shapes').select('product_id, shape:catalog_stone_shapes(name, slug)').in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
    loadCatalog(adminClient),
  ])

  const metalMap = new Map<string, string[]>()
  for (const row of metalSelections.data ?? []) {
    const name = extractRelatedName(row.metal as RelatedNameRow)
    if (!name) continue
    metalMap.set(row.product_id, [...(metalMap.get(row.product_id) ?? []), name])
  }

  const shapeMap = new Map<string, string[]>()
  if (!shapeSelections.error || !isMissingRelation(shapeSelections.error, 'product_stone_shapes')) {
    for (const row of shapeSelections.data ?? []) {
      const name = extractRelatedName(row.shape as RelatedNameRow)
      if (!name) continue
      shapeMap.set(row.product_id, [...(shapeMap.get(row.product_id) ?? []), name])
    }
  }

  const items = ((products ?? []) as ProductRecord[]).map((product) =>
    ({
      ...formatProductListItem(
        product,
        catalog,
        metalMap.get(product.id) ?? []
      ),
      defaultPurityPriceId: product.default_purity_price_id ?? null,
      shapesEnabled: Boolean(product.shapes_enabled),
      shapes: shapeMap.get(product.id) ?? [],
    })
  )

  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const body = (await request.json().catch(() => null)) as ProductPayload | null
  if (!body?.name || !body?.sku || !body?.main_category_id) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const baseInsert = {
    slug: `${slugify(body.name)}-${Date.now()}`,
    ...buildProductWritePayload(body),
  }

  const buildInsertPayload = (options?: { includeStyleId?: boolean; includeShapeFields?: boolean; includeOverrideFields?: boolean }) => {
    const includeStyleId = options?.includeStyleId ?? true
    const includeShapeFields = options?.includeShapeFields ?? true
    const includeOverrideFields = options?.includeOverrideFields ?? true
    const payload = buildProductWritePayload(body, includeStyleId)
    if (!includeShapeFields) {
      delete payload.shapes_enabled
    }
    if (!includeOverrideFields) {
      delete payload.shipping_override_enabled
      delete payload.care_warranty_override_enabled
    }
    return {
      slug: baseInsert.slug,
      ...payload,
    }
  }

  let { data: product, error } = await adminClient.from('products').insert(buildInsertPayload()).select('*').single()
  if (error && (isMissingStyleIdColumn(error) || isMissingProductColumn(error, 'shapes_enabled') || isMissingProductColumn(error, 'shipping_override_enabled') || isMissingProductColumn(error, 'care_warranty_override_enabled'))) {
    ;({ data: product, error } = await adminClient
      .from('products')
      .insert(
        buildInsertPayload({
          includeStyleId: !isMissingStyleIdColumn(error),
          includeShapeFields: !isMissingProductColumn(error, 'shapes_enabled'),
          includeOverrideFields: !isMissingProductColumn(error, 'shipping_override_enabled') && !isMissingProductColumn(error, 'care_warranty_override_enabled'),
        })
      )
      .select('*')
      .single())
  }

  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? 'Unable to create product.' }, { status: 500 })
  }

  if ((body.metal_ids ?? []).length > 0) {
    const { error: metalError } = await adminClient.from('product_metal_selections').insert(
      (body.metal_ids ?? []).map((metalId, index) => ({ product_id: product.id, metal_id: metalId, sort_order: index + 1 }))
    )
    if (metalError) return NextResponse.json({ error: metalError.message }, { status: 500 })
  }

  if ((body.shape_ids ?? []).length > 0) {
    const { error: shapeError } = await adminClient.from('product_stone_shapes').insert(
      (body.shape_ids ?? []).map((shapeId) => ({ product_id: product.id, shape_id: shapeId }))
    )
    if (shapeError && !isMissingRelation(shapeError, 'product_stone_shapes')) {
      return NextResponse.json({ error: shapeError.message }, { status: 500 })
    }
  }

  const purityPricesResult = await replaceProductPurityPrices(adminClient, product.id, body.purity_prices ?? [], body.default_purity_price_id ?? null)
  if ('error' in purityPricesResult && purityPricesResult.error) {
    return NextResponse.json({ error: purityPricesResult.error.message }, { status: 500 })
  }

  const metalMediaResult = await replaceProductMetalMedia(adminClient, product.id, body.metal_media ?? [])
  if ('error' in metalMediaResult && metalMediaResult.error) {
    return NextResponse.json({ error: metalMediaResult.error.message }, { status: 500 })
  }

  return NextResponse.json({ item: product })
}
