import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import type { ProductDetailSection, ProductKeyValue, ProductMetalMedia, ProductPurityPrice, ProductRecord } from '@/lib/product-catalog'

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

  const fallbackDefaultId = normalizedRows[0]?.id ? resolvedIdMap.get(normalizedRows[0].id) ?? normalizedRows[0].id : null
  const resolvedDefaultId = defaultPurityPriceId ? resolvedIdMap.get(defaultPurityPriceId) ?? defaultPurityPriceId : fallbackDefaultId
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
      const updateResult = await adminClient.from('product_metal_media').update(row).eq('id', existingId)
      if (updateResult.error) return { error: updateResult.error }
    } else {
      const insertResult = await adminClient.from('product_metal_media').insert({ product_id: productId, ...row })
      if (insertResult.error) return { error: insertResult.error }
    }
  }

  return { ok: true }
}

async function replaceProductMaterialValueSelections(adminClient: any, productId: string, materialValueIds: string[]) {
  const existingResult = await adminClient
    .from('product_material_value_selections')
    .select('id, material_value_id')
    .eq('product_id', productId)
  if (existingResult.error && !isMissingRelation(existingResult.error, 'product_material_value_selections')) {
    return { error: existingResult.error }
  }

  const existingByValueId = new Map((existingResult.data ?? []).map((row: { id: string; material_value_id: string }) => [row.material_value_id, row.id]))
  const nextValueIds = [...new Set(materialValueIds.filter(Boolean))]
  const deleteIds = (existingResult.data ?? [])
    .filter((row: { material_value_id: string }) => !nextValueIds.includes(row.material_value_id))
    .map((row: { id: string }) => row.id)

  if (deleteIds.length > 0) {
    const deleteResult = await adminClient.from('product_material_value_selections').delete().in('id', deleteIds)
    if (deleteResult.error) return { error: deleteResult.error }
  }

  for (const [index, materialValueId] of nextValueIds.entries()) {
    const existingId = existingByValueId.get(materialValueId)
    if (existingId) {
      const updateResult = await adminClient.from('product_material_value_selections').update({ sort_order: index + 1 }).eq('id', existingId)
      if (updateResult.error) return { error: updateResult.error }
    } else {
      const insertResult = await adminClient
        .from('product_material_value_selections')
        .insert({ product_id: productId, material_value_id: materialValueId, sort_order: index + 1 })
      if (insertResult.error) return { error: insertResult.error }
    }
  }

  return { ok: true }
}

function buildProductUpdatePayload(body: ProductPayload, includeStyleId = true) {
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

  if (body.gemstone_value !== undefined) {
    payload.gemstone_value = body.gemstone_value
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
  material_value_ids?: string[]
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const { adminClient } = access

  const [productResult, metalsResult, materialValuesResult, purityPricesResult, metalMediaResult] = await Promise.all([
    adminClient.from('products').select('*').eq('id', id).single(),
    adminClient.from('product_metal_selections').select('metal_id').eq('product_id', id).order('sort_order', { ascending: true }),
    adminClient.from('product_material_value_selections').select('material_value_id').eq('product_id', id).order('sort_order', { ascending: true }),
    adminClient.from('product_purity_prices').select('*').eq('product_id', id).order('sort_order', { ascending: true }),
    adminClient.from('product_metal_media').select('*').eq('product_id', id),
  ])

  if (productResult.error) return NextResponse.json({ error: productResult.error.message }, { status: 500 })

  const shapeResult = await adminClient.from('product_stone_shapes').select('shape_id').eq('product_id', id)
  const shapeIds = shapeResult.error && isMissingRelation(shapeResult.error, 'product_stone_shapes')
    ? []
    : (shapeResult.data ?? []).map((item) => item.shape_id)

  return NextResponse.json({
    item: {
      ...(productResult.data as ProductRecord),
      metal_ids: (metalsResult.data ?? []).map((item) => item.metal_id),
      material_value_ids:
        materialValuesResult.error && isMissingRelation(materialValuesResult.error, 'product_material_value_selections')
          ? []
          : (materialValuesResult.data ?? []).map((item) => item.material_value_id),
      shape_ids: shapeIds,
      purity_prices: purityPricesResult.error && isMissingRelation(purityPricesResult.error, 'product_purity_prices') ? [] : (purityPricesResult.data ?? []),
      metal_media: metalMediaResult.error && isMissingRelation(metalMediaResult.error, 'product_metal_media') ? [] : (metalMediaResult.data ?? []),
    },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const { adminClient } = access
  const body = (await request.json().catch(() => null)) as ProductPayload | null
  if (!body?.name || !body?.sku || !body?.main_category_id) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const updateProduct = (options?: { includeStyleId?: boolean; includeShapeFields?: boolean; includeOverrideFields?: boolean }) => {
    const includeStyleId = options?.includeStyleId ?? true
    const includeShapeFields = options?.includeShapeFields ?? true
    const includeOverrideFields = options?.includeOverrideFields ?? true
    const payload = buildProductUpdatePayload(body, includeStyleId)
    if (!includeShapeFields) {
      delete payload.shapes_enabled
    }
    if (!includeOverrideFields) {
      delete payload.shipping_override_enabled
      delete payload.care_warranty_override_enabled
    }

    return (
    adminClient
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()
    )
  }

  let { data: product, error } = await updateProduct()
  if (error && (isMissingStyleIdColumn(error) || isMissingProductColumn(error, 'gemstone_value') || isMissingProductColumn(error, 'shapes_enabled') || isMissingProductColumn(error, 'shipping_override_enabled') || isMissingProductColumn(error, 'care_warranty_override_enabled'))) {
    ;({
      data: product,
      error,
    } = await updateProduct({
      includeStyleId: !isMissingStyleIdColumn(error),
      includeShapeFields: !isMissingProductColumn(error, 'shapes_enabled'),
      includeOverrideFields: !isMissingProductColumn(error, 'shipping_override_enabled') && !isMissingProductColumn(error, 'care_warranty_override_enabled'),
    }))
    if (error && isMissingProductColumn(error, 'gemstone_value')) {
      const retryPayload = buildProductUpdatePayload(body, !isMissingStyleIdColumn(error))
      delete retryPayload.gemstone_value
      if (isMissingProductColumn(error, 'shapes_enabled')) delete retryPayload.shapes_enabled
      if (isMissingProductColumn(error, 'shipping_override_enabled')) delete retryPayload.shipping_override_enabled
      if (isMissingProductColumn(error, 'care_warranty_override_enabled')) delete retryPayload.care_warranty_override_enabled
      ;({ data: product, error } = await adminClient.from('products').update(retryPayload).eq('id', id).select('*').single())
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient.from('product_metal_selections').delete().eq('product_id', id)

  if ((body.metal_ids ?? []).length > 0) {
    const { error: metalError } = await adminClient.from('product_metal_selections').insert(
      (body.metal_ids ?? []).map((metalId, index) => ({ product_id: id, metal_id: metalId, sort_order: index + 1 }))
    )
    if (metalError) return NextResponse.json({ error: metalError.message }, { status: 500 })
  }

  const deleteShapesResult = await adminClient.from('product_stone_shapes').delete().eq('product_id', id)
  if (deleteShapesResult.error && !isMissingRelation(deleteShapesResult.error, 'product_stone_shapes')) {
    return NextResponse.json({ error: deleteShapesResult.error.message }, { status: 500 })
  }

  if ((body.shape_ids ?? []).length > 0) {
    const { error: shapeError } = await adminClient.from('product_stone_shapes').insert(
      (body.shape_ids ?? []).map((shapeId) => ({ product_id: id, shape_id: shapeId }))
    )
    if (shapeError && !isMissingRelation(shapeError, 'product_stone_shapes')) {
      return NextResponse.json({ error: shapeError.message }, { status: 500 })
    }
  }

  const purityPricesResult = await replaceProductPurityPrices(adminClient, id, body.purity_prices ?? [], body.default_purity_price_id ?? null)
  if ('error' in purityPricesResult && purityPricesResult.error) {
    return NextResponse.json({ error: purityPricesResult.error.message }, { status: 500 })
  }

  const metalMediaResult = await replaceProductMetalMedia(adminClient, id, body.metal_media ?? [])
  if ('error' in metalMediaResult && metalMediaResult.error) {
    return NextResponse.json({ error: metalMediaResult.error.message }, { status: 500 })
  }

  const materialValueResult = await replaceProductMaterialValueSelections(adminClient, id, body.material_value_ids ?? [])
  if ('error' in materialValueResult && materialValueResult.error) {
    return NextResponse.json({ error: materialValueResult.error.message }, { status: 500 })
  }

  return NextResponse.json({ item: product })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const { error } = await access.adminClient.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
