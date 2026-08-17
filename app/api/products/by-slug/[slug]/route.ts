import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import type { ProductDetailSection, ProductFaqItem, ProductKeyValue, ProductMetalMedia, ProductPurityPrice, ProductRecord } from '@/lib/product-catalog'
import { loadProductLinkSelections, replaceProductOptionLinks, replaceProductSubcategoryLinks } from '@/lib/product-catalog-links'
import {
  type ProductMetalVariant,
  type ProductVariantMediaItem,
  loadProductMetalVariantBundle,
  replaceProductMetalVariants,
  replaceProductVariantMediaItems,
} from '@/lib/product-metal-variants'
import { loadProductFaqItems, replaceProductFaqItems } from '@/lib/product-faqs'
import { loadProductCustomDropdowns, syncProductCustomDropdowns, validateProductCustomDropdowns, type ProductCustomDropdown } from '@/lib/product-custom-dropdowns'
import { validateProductMasterReferences } from '@/lib/product-master-validation'

function isMissingRelation(error: { message?: string | null } | null | undefined, table: string) {
  return (
    error?.message?.includes(`relation "${table}" does not exist`) ||
    error?.message?.includes(`Could not find the table 'public.${table}' in the schema cache`)
  ) ?? false
}

function isMissingProductColumn(error: { message?: string | null } | null | undefined, column: string) {
  return error?.message?.includes(`Could not find the '${column}' column of 'products'`) ?? false
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

type ProductPayload = {
  name: string
  sku: string
  product_lane?: 'standard' | 'hiphop' | 'collection'
  detail_template?: 'standard' | 'hiphop'
  featured: boolean
  description: string | null
  tag_line: string | null
  seo_title?: string | null
  seo_description?: string | null
  h1_title?: string | null
  base_price: number | null
  discount_price: number | null
  gst_slab_id?: string | null
  stock_quantity?: number | null
  allow_checkout?: boolean | null
  status: string
  main_category_id: string
  subcategory_id: string | null
  option_id: string | null
  linked_subcategory_ids?: string[]
  linked_option_ids?: string[]
  style_id?: string | null
  metal_ids: string[]
  metal_variants?: ProductMetalVariant[]
  default_variant_media_items?: ProductVariantMediaItem[]
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
  custom_dropdowns_enabled?: boolean
  custom_dropdowns?: ProductCustomDropdown[]
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
  faq_items?: ProductFaqItem[]
  image_1_path?: string | null
  image_2_path?: string | null
  image_3_path?: string | null
  image_4_path?: string | null
  image_1_alt?: string | null
  image_2_alt?: string | null
  image_3_alt?: string | null
  image_4_alt?: string | null
  video_path?: string | null
  model_3d_url?: string | null
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

async function getProductIdBySlug(adminClient: any, slug: string) {
  const slugResult = await adminClient.from('products').select('id').eq('slug', slug).maybeSingle()
  if (slugResult.data?.id || slugResult.error) return slugResult
  return adminClient.from('products').select('id').eq('id', slug).maybeSingle()
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { slug } = await params
  const { adminClient } = access
  const productIdResult = await getProductIdBySlug(adminClient, slug)

  if (productIdResult.error || !productIdResult.data?.id) {
    return NextResponse.json({ error: productIdResult.error?.message ?? 'Product not found.' }, { status: 404 })
  }

  const id = productIdResult.data.id
  const [productResult, metalsResult, materialValuesResult, purityPricesResult, metalMediaResult, linkSelections, metalVariantBundle, faqItems] = await Promise.all([
    adminClient.from('products').select('*').eq('id', id).single(),
    adminClient.from('product_metal_selections').select('metal_id').eq('product_id', id).order('sort_order', { ascending: true }),
    adminClient.from('product_material_value_selections').select('material_value_id').eq('product_id', id).order('sort_order', { ascending: true }),
    adminClient.from('product_purity_prices').select('*').eq('product_id', id).order('sort_order', { ascending: true }),
    adminClient.from('product_metal_media').select('*').eq('product_id', id),
    loadProductLinkSelections(adminClient, id),
    loadProductMetalVariantBundle(adminClient, id),
    loadProductFaqItems(adminClient, id),
  ])

  if (productResult.error) return NextResponse.json({ error: productResult.error.message }, { status: 500 })

  const shapeResult = await adminClient.from('product_stone_shapes').select('shape_id').eq('product_id', id)
  const shapeIds = shapeResult.error && isMissingRelation(shapeResult.error, 'product_stone_shapes')
    ? []
    : (shapeResult.data ?? []).map((item) => item.shape_id)

  const customDropdowns = await loadProductCustomDropdowns(adminClient, id)
  if (customDropdowns.error) return NextResponse.json({ error: customDropdowns.error }, { status: 500 })
  return NextResponse.json({
    item: {
      ...(productResult.data as ProductRecord),
      metal_ids: (metalsResult.data ?? []).map((item) => item.metal_id),
      linked_subcategory_ids: linkSelections.linkedSubcategoryIds,
      linked_option_ids: linkSelections.linkedOptionIds,
      material_value_ids:
        materialValuesResult.error && isMissingRelation(materialValuesResult.error, 'product_material_value_selections')
          ? []
          : (materialValuesResult.data ?? []).map((item) => item.material_value_id),
      shape_ids: shapeIds,
      purity_prices: purityPricesResult.error && isMissingRelation(purityPricesResult.error, 'product_purity_prices') ? [] : (purityPricesResult.data ?? []),
      metal_media: metalMediaResult.error && isMissingRelation(metalMediaResult.error, 'product_metal_media') ? [] : (metalMediaResult.data ?? []),
      metal_variants: metalVariantBundle.metalVariants,
      default_variant_media_items: metalVariantBundle.defaultVariantMediaItems,
      faq_items: faqItems,
      custom_dropdowns: customDropdowns.data ?? [],
    },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { slug } = await params
  const { adminClient } = access
  const productIdResult = await getProductIdBySlug(adminClient, slug)

  if (productIdResult.error || !productIdResult.data?.id) {
    return NextResponse.json({ error: productIdResult.error?.message ?? 'Product not found.' }, { status: 404 })
  }

  const id = productIdResult.data.id
  const body = (await request.json().catch(() => null)) as ProductPayload | null
  if (!body?.name || !body?.sku || !body?.main_category_id) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }
  const customDropdownError = body.custom_dropdowns_enabled ? validateProductCustomDropdowns((body.custom_dropdowns ?? []) as ProductCustomDropdown[]) : null
  if (customDropdownError) return NextResponse.json({ error: customDropdownError }, { status: 400 })

  const masterValidation = await validateProductMasterReferences(adminClient, body)
  if (!masterValidation.ok) {
    return NextResponse.json({ error: masterValidation.message }, { status: 400 })
  }

  const variantRows = body.metal_variants ?? []
  const resolvedMetalIds =
    variantRows.length > 0
      ? [...new Set(variantRows.map((entry) => entry.metal_id).filter(Boolean))]
      : (body.metal_ids ?? [])
  const defaultVariant =
    variantRows.find((entry) => entry.is_default) ??
    variantRows[0] ??
    null
  const resolvedBasePrice =
    defaultVariant && Number.isFinite(Number(defaultVariant.price))
      ? Number(defaultVariant.price)
      : body.base_price

  let { data: product, error } = await adminClient
    .from('products')
    .update({
      name: body.name,
      sku: body.sku,
      product_lane: body.product_lane ?? 'standard',
      detail_template: body.detail_template ?? 'standard',
      main_category_id: body.main_category_id,
      subcategory_id: body.subcategory_id,
      option_id: body.option_id,
      style_id: body.style_id ?? null,
      description: body.description,
      tag_line: body.tag_line,
      seo_title: body.seo_title?.trim() || null,
      seo_description: body.seo_description?.trim() || null,
      h1_title: body.h1_title?.trim() || null,
      base_price: resolvedBasePrice,
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
      custom_dropdowns_enabled: body.custom_dropdowns_enabled ?? false,
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
      image_1_alt: body.image_1_alt?.trim() || null,
      image_2_alt: body.image_2_alt?.trim() || null,
      image_3_alt: body.image_3_alt?.trim() || null,
      image_4_alt: body.image_4_alt?.trim() || null,
      video_path: body.video_path ?? null,
      model_3d_url: body.model_3d_url ?? null,
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
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error && (isMissingProductColumn(error, 'gemstone_value') || isMissingProductColumn(error, 'shapes_enabled') || isMissingProductColumn(error, 'shipping_override_enabled') || isMissingProductColumn(error, 'care_warranty_override_enabled') || isMissingProductColumn(error, 'model_3d_url'))) {
    const retryPayload: Record<string, unknown> = {
      name: body.name,
      sku: body.sku,
      product_lane: body.product_lane ?? 'standard',
      detail_template: body.detail_template ?? 'standard',
      main_category_id: body.main_category_id,
      subcategory_id: body.subcategory_id,
      option_id: body.option_id,
      style_id: body.style_id ?? null,
      description: body.description,
      tag_line: body.tag_line,
      seo_title: body.seo_title?.trim() || null,
      seo_description: body.seo_description?.trim() || null,
      h1_title: body.h1_title?.trim() || null,
      base_price: resolvedBasePrice,
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
      custom_dropdowns_enabled: body.custom_dropdowns_enabled ?? false,
      ring_category_id: body.ring_enabled ? body.ring_category_id ?? null : null,
      fit_options: body.fit_options ?? [],
      fit_label: body.fit_label,
      gemstone_label: body.gemstone_label,
      show_purity: body.show_purity,
      engraving_enabled: body.engraving_enabled,
      engraving_label: body.engraving_label,
      shipping_rule_id: body.shipping_rule_id,
      care_warranty_rule_id: body.care_warranty_rule_id,
      shipping_enabled: body.shipping_enabled,
      care_warranty_enabled: body.care_warranty_enabled,
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
      image_1_alt: body.image_1_alt?.trim() || null,
      image_2_alt: body.image_2_alt?.trim() || null,
      image_3_alt: body.image_3_alt?.trim() || null,
      image_4_alt: body.image_4_alt?.trim() || null,
      video_path: body.video_path ?? null,
      model_3d_url: body.model_3d_url ?? null,
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
    if (!isMissingProductColumn(error, 'shapes_enabled')) {
      retryPayload.shapes_enabled = body.shapes_enabled ?? false
    }
    if (!isMissingProductColumn(error, 'gemstone_value')) {
      retryPayload.gemstone_value = body.gemstone_value
    }
    if (!isMissingProductColumn(error, 'shipping_override_enabled')) {
      retryPayload.shipping_override_enabled = body.shipping_override_enabled ?? false
    }
    if (!isMissingProductColumn(error, 'care_warranty_override_enabled')) {
      retryPayload.care_warranty_override_enabled = body.care_warranty_override_enabled ?? false
    }
    if (isMissingProductColumn(error, 'model_3d_url')) {
      delete retryPayload.model_3d_url
    }

    ;({ data: product, error } = await adminClient.from('products').update(retryPayload).eq('id', id).select('*').single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient.from('product_metal_selections').delete().eq('product_id', id)

  if (resolvedMetalIds.length > 0) {
    const { error: metalError } = await adminClient.from('product_metal_selections').insert(
      resolvedMetalIds.map((metalId, index) => ({ product_id: id, metal_id: metalId, sort_order: index + 1 }))
    )
    if (metalError) return NextResponse.json({ error: metalError.message }, { status: 500 })
  }

  const deleteShapesResult = await adminClient.from('product_stone_shapes').delete().eq('product_id', id)
  if (deleteShapesResult.error) {
    return NextResponse.json({ error: deleteShapesResult.error.message }, { status: 500 })
  }

  if ((body.shape_ids ?? []).length > 0) {
    const { error: shapeError } = await adminClient.from('product_stone_shapes').insert(
      (body.shape_ids ?? []).map((shapeId) => ({ product_id: id, shape_id: shapeId }))
    )
    if (shapeError) {
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

  const subcategoryLinkResult = await replaceProductSubcategoryLinks(
    adminClient,
    id,
    body.subcategory_id ?? null,
    body.linked_subcategory_ids ?? []
  )
  if ('error' in subcategoryLinkResult && subcategoryLinkResult.error) {
    return NextResponse.json({ error: subcategoryLinkResult.error.message }, { status: 500 })
  }

  const optionLinkResult = await replaceProductOptionLinks(
    adminClient,
    id,
    body.option_id ?? null,
    body.linked_option_ids ?? []
  )
  if ('error' in optionLinkResult && optionLinkResult.error) {
    return NextResponse.json({ error: optionLinkResult.error.message }, { status: 500 })
  }

  const metalVariantsResult = await replaceProductMetalVariants(adminClient, id, variantRows)
  if ('error' in metalVariantsResult && metalVariantsResult.error) {
    return NextResponse.json({ error: metalVariantsResult.error.message }, { status: 500 })
  }

  const variantMediaResult = await replaceProductVariantMediaItems(adminClient, id, {
    variants: variantRows,
    defaultMediaItems: body.default_variant_media_items ?? [],
    persistedVariantRows: metalVariantsResult.data ?? [],
  })
  if ('error' in variantMediaResult && variantMediaResult.error) {
    return NextResponse.json({ error: variantMediaResult.error.message }, { status: 500 })
  }

  const faqResult = await replaceProductFaqItems(adminClient, id, body.faq_items ?? [])
  if ('error' in faqResult && faqResult.error) {
    return NextResponse.json({ error: faqResult.error.message }, { status: 500 })
  }

  if (body.custom_dropdowns_enabled) {
    const customDropdownResult = await syncProductCustomDropdowns(adminClient, id, (body.custom_dropdowns ?? []) as ProductCustomDropdown[])
    if (customDropdownResult.error) return NextResponse.json({ error: customDropdownResult.error }, { status: 400 })
  }

  return NextResponse.json({ item: product })
}
