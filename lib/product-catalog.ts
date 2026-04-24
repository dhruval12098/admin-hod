export type CatalogStatus = 'active' | 'hidden'
export type ProductStatus = 'draft' | 'active' | 'hidden' | 'archived'
export type WeddingGender = 'for_her' | 'for_him' | null
export type CategoryCode = string

export type ProductKeyValue = {
  key: string
  value: string
}

export type ProductDetailSection = {
  id: string
  title: string
  rows: ProductKeyValue[]
  visible: boolean
}

export type CatalogCategory = {
  id: string
  code: CategoryCode
  name: string
  slug: string
  show_in_nav?: boolean
  nav_type: 'mega_menu' | 'direct_link' | null
  direct_link_url: string | null
  display_order: number
  status: CatalogStatus
}

export type CatalogSubcategory = {
  id: string
  category_id: string
  name: string
  slug: string
  sub_type: 'standard' | 'auto_shape' | 'manual_style' | 'auto_metal' | 'gender_split'
  display_order: number
  status: CatalogStatus
}

export type CatalogOption = {
  id: string
  subcategory_id: string
  name: string
  slug: string
  display_order: number
  status: CatalogStatus
}

export type CatalogMetal = {
  id: string
  name: string
  slug: string
  display_order: number
  status: CatalogStatus
}

export type CatalogStoneShape = {
  id: string
  name: string
  slug: string
  svg_asset_url: string | null
  display_order: number
  status: CatalogStatus
}

export type CatalogRingSize = {
  id: string
  name: string
  slug: string
  display_order: number
  status: CatalogStatus
}

export type CatalogCertificate = {
  id: string
  name: string
  code?: string | null
  slug?: string | null
  display_order?: number | null
  status?: CatalogStatus
}

export type CatalogGstSlab = {
  id: string
  name: string
  code: string
  percentage: number
  description?: string | null
  display_order?: number | null
  status?: CatalogStatus
}

export type ProductContentRule = {
  id: string
  kind: 'shipping' | 'care_warranty'
  name: string
  slug: string
  title: string
  body: string
  display_order?: number | null
  status?: CatalogStatus
}

export type ProductRecord = {
  id: string
  name: string
  slug: string
  sku: string
  detail_template?: 'standard' | 'hiphop'
  main_category_id: string
  subcategory_id: string | null
  option_id: string | null
  wedding_gender: WeddingGender
  description: string | null
  tag_line: string | null
  base_price: number | null
  discount_price: number | null
  gst_slab_id?: string | null
  featured: boolean
  status: ProductStatus
  image_1_path?: string | null
  image_2_path?: string | null
  image_3_path?: string | null
  image_4_path?: string | null
  video_path?: string | null
  show_image_1?: boolean | null
  show_image_2?: boolean | null
  show_image_3?: boolean | null
  show_image_4?: boolean | null
  show_video?: boolean | null
  stock_quantity?: number | null
  custom_order_enabled?: boolean | null
  ready_to_ship?: boolean | null
  hiphop_badges?: string[] | null
  chain_length_options?: string[] | null
  hiphop_carat_label?: string | null
  hiphop_carat_values?: string[] | null
  gram_weight_label?: string | null
  gram_weight_value?: string | null
  features?: string[] | null
  purity_values?: string[] | null
  certificate_ids?: string[] | null
  ring_size_ids?: string[] | null
  fit_options?: string[] | null
  fit_label?: string | null
  gemstone_label?: string | null
  gemstone_value?: string | null
  show_purity?: boolean | null
  engraving_enabled?: boolean | null
  engraving_label?: string | null
  shipping_rule_id?: string | null
  care_warranty_rule_id?: string | null
  shipping_enabled?: boolean | null
  care_warranty_enabled?: boolean | null
  shipping_title_override?: string | null
  shipping_body_override?: string | null
  care_warranty_title_override?: string | null
  care_warranty_body_override?: string | null
  specifications?: ProductKeyValue[] | null
  product_details?: ProductKeyValue[] | null
  detail_sections?: ProductDetailSection[] | null
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function formatCategoryPath(args: {
  category: CatalogCategory | undefined
  subcategory?: CatalogSubcategory | undefined
  option?: CatalogOption | undefined
}) {
  const { category, subcategory, option } = args
  if (!category) return ''

  return [category.name, subcategory?.name, option?.name].filter(Boolean).join(' > ')
}
