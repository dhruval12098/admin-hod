import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import type {
  CatalogCategory,
  CatalogCertificate,
  CatalogGstSlab,
  CatalogMetal,
  CatalogOption,
  CatalogRingSize,
  CatalogStoneShape,
  CatalogSubcategory,
  ProductDetailSection,
  ProductKeyValue,
  ProductRecord,
} from '@/lib/product-catalog'
import { formatCategoryPath, slugify } from '@/lib/product-catalog'

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

async function loadCatalog(adminClient: any) {
  const [categoriesResult, subcategoriesResult, optionsResult, metalsResult, shapesResult, certificatesResult, ringSizesResult, gstSlabsResult] = await Promise.all([
    adminClient.from('catalog_categories').select('*'),
    adminClient.from('catalog_subcategories').select('*'),
    adminClient.from('catalog_options').select('*'),
    adminClient.from('catalog_metals').select('*'),
    adminClient.from('catalog_stone_shapes').select('*'),
    adminClient.from('catalog_certificates').select('*'),
    adminClient.from('catalog_ring_sizes').select('*'),
    adminClient.from('catalog_gst_slabs').select('*'),
  ])

  return {
    categories: (categoriesResult.data ?? []) as CatalogCategory[],
    subcategories: (subcategoriesResult.data ?? []) as CatalogSubcategory[],
    options: (optionsResult.data ?? []) as CatalogOption[],
    metals: (metalsResult.data ?? []) as CatalogMetal[],
    shapes: (shapesResult.data ?? []) as CatalogStoneShape[],
    certificates: certificatesResult.error ? ([] as CatalogCertificate[]) : ((certificatesResult.data ?? []) as CatalogCertificate[]),
    ringSizes: ringSizesResult.error ? ([] as CatalogRingSize[]) : ((ringSizesResult.data ?? []) as CatalogRingSize[]),
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
  const gstSlab = catalog.gstSlabs.find((item) => item.id === product.gst_slab_id)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
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
  }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { data: products, error } = await adminClient.from('products').select('*').order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const productIds = (products ?? []).map((product) => product.id)
  const [metalSelections, catalog] = await Promise.all([
    productIds.length
      ? adminClient.from('product_metal_selections').select('product_id, metal:catalog_metals(name)').in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
    loadCatalog(adminClient),
  ])

  const metalMap = new Map<string, string[]>()
  for (const row of metalSelections.data ?? []) {
    const name = Array.isArray(row.metal) ? row.metal[0]?.name : row.metal?.name
    if (!name) continue
    metalMap.set(row.product_id, [...(metalMap.get(row.product_id) ?? []), name])
  }

  const items = ((products ?? []) as ProductRecord[]).map((product) =>
    formatProductListItem(
      product,
      catalog,
      metalMap.get(product.id) ?? []
    )
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

  const productInsert = {
    name: body.name,
    slug: `${slugify(body.name)}-${Date.now()}`,
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
  }

  const { data: product, error } = await adminClient.from('products').insert(productInsert).select('*').single()
  if (error || !product) {
    return NextResponse.json({ error: error?.message ?? 'Unable to create product.' }, { status: 500 })
  }

  if ((body.metal_ids ?? []).length > 0) {
    const { error: metalError } = await adminClient.from('product_metal_selections').insert(
      (body.metal_ids ?? []).map((metalId, index) => ({ product_id: product.id, metal_id: metalId, sort_order: index + 1 }))
    )
    if (metalError) return NextResponse.json({ error: metalError.message }, { status: 500 })
  }

  return NextResponse.json({ item: product })
}
