import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import type { ProductDetailSection, ProductKeyValue, ProductRecord } from '@/lib/product-catalog'

type ProductPayload = {
  name: string
  sku: string
  detail_template?: 'standard' | 'hiphop'
  featured: boolean
  description: string | null
  tag_line: string | null
  base_price: number | null
  discount_price: number | null
  gst_slab_id?: string | null
  stock_quantity?: number | null
  status: string
  main_category_id: string
  subcategory_id: string | null
  option_id: string | null
  metal_ids: string[]
  purity_values: string[]
  certificate_ids: string[]
  ring_size_ids: string[]
  fit_options: string[]
  fit_label: string | null
  gemstone_label: string | null
  gemstone_value: string | null
  show_purity: boolean
  engraving_enabled: boolean
  engraving_label: string | null
  shipping_rule_id: string | null
  care_warranty_rule_id: string | null
  shipping_enabled: boolean
  care_warranty_enabled: boolean
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

  const [productResult, metalsResult] = await Promise.all([
    adminClient.from('products').select('*').eq('id', id).single(),
    adminClient.from('product_metal_selections').select('metal_id').eq('product_id', id).order('sort_order', { ascending: true }),
  ])

  if (productResult.error) return NextResponse.json({ error: productResult.error.message }, { status: 500 })

  return NextResponse.json({
    item: {
      ...(productResult.data as ProductRecord),
      metal_ids: (metalsResult.data ?? []).map((item) => item.metal_id),
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

  const { data: product, error } = await adminClient
    .from('products')
    .update({
      name: body.name,
      sku: body.sku,
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
      featured: body.featured,
      status: body.status || 'draft',
      features: body.features ?? [],
      purity_values: body.purity_values ?? [],
      certificate_ids: body.certificate_ids ?? [],
      ring_size_ids: body.ring_size_ids ?? [],
      fit_options: body.fit_options ?? [],
      fit_label: body.fit_label,
      gemstone_label: body.gemstone_label,
      gemstone_value: body.gemstone_value,
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
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient.from('product_metal_selections').delete().eq('product_id', id)

  if ((body.metal_ids ?? []).length > 0) {
    const { error: metalError } = await adminClient.from('product_metal_selections').insert(
      (body.metal_ids ?? []).map((metalId, index) => ({ product_id: id, metal_id: metalId, sort_order: index + 1 }))
    )
    if (metalError) return NextResponse.json({ error: metalError.message }, { status: 500 })
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
