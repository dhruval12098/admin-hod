import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { assertAdmin } from '@/lib/cms-auth'

type NamedRow = { id: string; name: string }
type ProductRow = {
  id: string
  name: string | null
  sku: string | null
  product_lane: string | null
  main_category_id: string | null
  subcategory_id: string | null
  option_id: string | null
  style_id: string | null
  description: string | null
  stock_quantity: number | null
  discount_price: number | null
  image_1_path: string | null
  image_2_path: string | null
  image_3_path: string | null
  image_4_path: string | null
  video_path: string | null
  created_at: string | null
}

const PRODUCT_TABS = ['Ring_Final', 'Earring_Final', 'Pendant_Final', 'BrcBg'] as const
const R2_PUBLIC_BASE_URL = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ?? ''
const HEADERS = [
  'No',
  'Upload Date',
  'SKU',
  'Image',
  'Category',
  'Sub-Cat.',
  'Option',
  'By Shape',
  'Gender',
  'Material',
  'Style',
  'Style No.',
  'Title',
  'Description',
  'Metal',
  'Variant Prices',
  'Variant Images',
  'Variant Videos',
  'NSP Price',
  'FAQ 1 Question',
  'FAQ 1 Answer',
]

function isMissingRelation(error: { message?: string | null } | null | undefined, table: string) {
  const message = error?.message ?? ''
  return message.includes(`relation "${table}" does not exist`) || message.includes(`Could not find the table 'public.${table}'`)
}

function byId(rows: NamedRow[] | null | undefined) {
  return new Map((rows ?? []).map((row) => [row.id, row.name]))
}

function valueText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function priceText(value: unknown) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return ''
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function toPublicUrl(value: string | null | undefined) {
  const text = valueText(value)
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  return R2_PUBLIC_BASE_URL ? `${R2_PUBLIC_BASE_URL}/${text.replace(/^\/+/, '')}` : text
}

function compact(values: Array<string | null | undefined>) {
  return values.map((value) => valueText(value)).filter(Boolean)
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function groupedJoin(groups: string[][]) {
  return groups.map((group) => unique(group).join(',')).filter(Boolean).join('|')
}

function firstFilledGroup(groups: string[][]) {
  return groups.find((group) => group.some(Boolean)) ?? []
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function buildMetalLabel(metal: { name: string; display_label?: string | null; purity_label?: string | null; base_metal_name?: string | null }) {
  return metal.display_label || [metal.purity_label, metal.base_metal_name || metal.name].filter(Boolean).join(' ') || metal.name
}

function chooseTab(product: ProductRow, subcategoryName: string, categoryName: string) {
  const lane = valueText(product.product_lane).toLowerCase()
  if (lane === 'hiphop') return 'BrcBg'

  const haystack = `${categoryName} ${subcategoryName}`.toLowerCase()
  if (haystack.includes('earring')) return 'Earring_Final'
  if (haystack.includes('necklace') || haystack.includes('pendant')) return 'Pendant_Final'
  if (haystack.includes('bracelet') || haystack.includes('bangle')) return 'BrcBg'
  return 'Ring_Final'
}

function addGuideSheets(workbook: ExcelJS.Workbook) {
  const howTo = workbook.addWorksheet('How To Use')
  howTo.addRow(['Column', 'How To Fill', 'Example'])
  ;[
    ['SKU', 'Use a unique SKU for each product. Existing SKUs update; new SKUs create new products.', 'RING-S2-001'],
    ['Image', 'Use image URLs separated by commas.', 'url-1,url-2'],
    ['Sub-Cat.', 'Use one subcategory, or multiple with |.', 'Stud Earrings|Drop & Dangle'],
    ['Option', 'Use one option, or multiple with |.', 'Tennis|Bangles'],
    ['By Shape', 'Use one or more shapes separated by commas.', 'Round, Oval'],
    ['Material', 'Use material master values separated by commas.', 'Natural Diamond, Lab Grown Diamond'],
    ['Metal', 'Use one or more metal variants separated by |.', '14K Yellow Gold|18K Rose Gold'],
    ['Variant Prices', 'Match each metal using | in the same order.', '61000|64250'],
    ['Variant Images', 'Use commas inside one variant group and | between variants.', 'url-1,url-2|url-3,url-4'],
    ['Variant Videos', 'Use one video URL per variant, separated by |.', 'video-1|video-2'],
    ['FAQ 1 Question / Answer', 'Optional product FAQ pair. Leave blank if not needed.', 'Can this be customized?'],
  ].forEach((row) => howTo.addRow(row))
  howTo.columns = [{ width: 22 }, { width: 80 }, { width: 44 }]
  howTo.getRow(1).font = { bold: true }

  const scenario = workbook.addWorksheet('Scenario Guide')
  scenario.addRow(['Tab', 'What Goes Here'])
  scenario.addRow(['Ring_Final', 'Engagement rings and ring-style products'])
  scenario.addRow(['Earring_Final', 'Earrings'])
  scenario.addRow(['Pendant_Final', 'Necklaces and pendants'])
  scenario.addRow(['BrcBg', 'Bracelets, bangles, and fallback/hiphop products'])
  scenario.columns = [{ width: 22 }, { width: 70 }]
  scenario.getRow(1).font = { bold: true }
}

function addProductSheet(workbook: ExcelJS.Workbook, name: string) {
  const sheet = workbook.addWorksheet(name)
  sheet.views = [{ state: 'frozen', xSplit: 5, ySplit: 5, topLeftCell: 'F6' }]

  sheet.getCell('C1').value = '#-F'
  sheet.getCell('Q1').value = '#-F'
  sheet.getCell('R1').value = '#-F'
  sheet.getCell('A4').value = { formula: 'COUNTA(A5:U5)' }
  sheet.getCell('B4').value = { formula: 'COUNTA(A5:U5)' }
  sheet.getCell('C4').value = 'Item'
  sheet.getCell('D4').value = 'Item'
  sheet.getCell('E4').value = 'Item'
  sheet.getCell('O4').value = 'Variants'
  sheet.getCell('P4').value = 'Variants'
  sheet.getCell('Q4').value = 'Variants'
  sheet.getCell('R4').value = 'Variants'
  sheet.getCell('S4').value = { formula: 'COUNTA(A5:U5)' }

  for (let rowNumber = 1; rowNumber <= 4; rowNumber += 1) {
    sheet.getRow(rowNumber).hidden = true
  }

  sheet.getRow(5).values = HEADERS
  sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }
  sheet.getRow(5).alignment = { vertical: 'middle', wrapText: true }

  HEADERS.forEach((header, index) => {
    const column = sheet.getColumn(index + 1)
    column.width = Math.max(12, Math.min(42, header.length + 8))
  })

  sheet.getColumn(4).width = 50
  sheet.getColumn(14).width = 60
  sheet.getColumn(17).width = 56
  sheet.getColumn(18).width = 48
  sheet.getColumn(20).width = 34
  sheet.getColumn(21).width = 60

  return sheet
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const adminClient = access.adminClient
  const [
    productsResult,
    categoriesResult,
    subcategoriesResult,
    optionsResult,
    stylesResult,
    materialValuesResult,
    metalsResult,
    metalSelectionsResult,
    materialSelectionsResult,
    purityPricesResult,
    shapeSelectionsResult,
    stoneShapesResult,
    subcategoryLinksResult,
    optionLinksResult,
    metalVariantsResult,
    variantMediaResult,
    faqResult,
  ] = await Promise.all([
    adminClient
      .from('products')
      .select('id, name, sku, product_lane, main_category_id, subcategory_id, option_id, style_id, description, stock_quantity, discount_price, image_1_path, image_2_path, image_3_path, image_4_path, video_path, created_at')
      .order('created_at', { ascending: false }),
    adminClient.from('catalog_categories').select('id, name'),
    adminClient.from('catalog_subcategories').select('id, name'),
    adminClient.from('catalog_options').select('id, name'),
    adminClient.from('catalog_styles').select('id, name'),
    adminClient.from('catalog_material_values').select('id, name'),
    adminClient.from('catalog_metals').select('id, name, display_label, purity_label, base_metal_name'),
    adminClient.from('product_metal_selections').select('product_id, metal_id, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_material_value_selections').select('product_id, material_value_id, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_purity_prices').select('product_id, purity_label, price, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_stone_shapes').select('product_id, shape_id'),
    adminClient.from('catalog_stone_shapes').select('id, name'),
    adminClient.from('product_subcategory_links').select('product_id, subcategory_id, is_primary, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_option_links').select('product_id, option_id, is_primary, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_metal_variants').select('id, product_id, metal_id, price, sort_order').order('sort_order', { ascending: true }),
    adminClient.from('product_variant_media_items').select('product_id, variant_id, media_type, media_path, sort_order, is_default_fallback').order('sort_order', { ascending: true }),
    adminClient.from('product_faq_items').select('product_id, question, answer, sort_order, is_active').eq('is_active', true).order('sort_order', { ascending: true }),
  ])

  const firstError = [
    productsResult.error,
    categoriesResult.error,
    subcategoriesResult.error,
    optionsResult.error,
    stylesResult.error,
    materialValuesResult.error,
    metalsResult.error,
    metalSelectionsResult.error,
    materialSelectionsResult.error,
    purityPricesResult.error,
    shapeSelectionsResult.error,
    stoneShapesResult.error,
    subcategoryLinksResult.error,
    optionLinksResult.error,
    metalVariantsResult.error,
    variantMediaResult.error,
    faqResult.error && !isMissingRelation(faqResult.error, 'product_faq_items') ? faqResult.error : null,
  ].find(Boolean)

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  const categoryNames = byId(categoriesResult.data as NamedRow[])
  const subcategoryNames = byId(subcategoriesResult.data as NamedRow[])
  const optionNames = byId(optionsResult.data as NamedRow[])
  const styleNames = byId(stylesResult.data as NamedRow[])
  const materialNames = byId(materialValuesResult.data as NamedRow[])
  const shapeNames = byId(stoneShapesResult.data as NamedRow[])
  const metalNames = new Map(
    ((metalsResult.data ?? []) as Array<{ id: string; name: string; display_label?: string | null; purity_label?: string | null; base_metal_name?: string | null }>).map((metal) => [metal.id, buildMetalLabel(metal)])
  )

  const groupByProduct = <T extends { product_id: string }>(rows: T[] | null | undefined) => {
    const map = new Map<string, T[]>()
    for (const row of rows ?? []) {
      map.set(row.product_id, [...(map.get(row.product_id) ?? []), row])
    }
    return map
  }

  const metalsByProduct = groupByProduct(metalSelectionsResult.data as Array<{ product_id: string; metal_id: string; sort_order: number }>)
  const materialsByProduct = groupByProduct(materialSelectionsResult.data as Array<{ product_id: string; material_value_id: string; sort_order: number }>)
  const pricesByProduct = groupByProduct(purityPricesResult.data as Array<{ product_id: string; purity_label: string; price: number; sort_order: number }>)
  const shapesByProduct = groupByProduct(shapeSelectionsResult.data as Array<{ product_id: string; shape_id: string }>)
  const linkedSubcategoriesByProduct = groupByProduct(subcategoryLinksResult.data as Array<{ product_id: string; subcategory_id: string; is_primary: boolean; sort_order: number }>)
  const linkedOptionsByProduct = groupByProduct(optionLinksResult.data as Array<{ product_id: string; option_id: string; is_primary: boolean; sort_order: number }>)
  const variantsByProduct = groupByProduct(metalVariantsResult.data as Array<{ id: string; product_id: string; metal_id: string; price: number; sort_order: number }>)
  const mediaByVariant = new Map<string, Array<{ media_type: string; media_path: string; sort_order: number }>>()
  const fallbackMediaByProduct = new Map<string, Array<{ media_type: string; media_path: string; sort_order: number }>>()
  for (const item of (variantMediaResult.data ?? []) as Array<{ product_id: string; variant_id: string | null; media_type: string; media_path: string; sort_order: number; is_default_fallback: boolean }>) {
    if (item.variant_id) {
      mediaByVariant.set(item.variant_id, [...(mediaByVariant.get(item.variant_id) ?? []), item])
    } else if (item.is_default_fallback) {
      fallbackMediaByProduct.set(item.product_id, [...(fallbackMediaByProduct.get(item.product_id) ?? []), item])
    }
  }
  const faqsByProduct = groupByProduct(
    faqResult.error && isMissingRelation(faqResult.error, 'product_faq_items')
      ? []
      : faqResult.data as Array<{ product_id: string; question: string; answer: string; sort_order: number }>
  )

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'House of Diams Admin'
  workbook.created = new Date()
  addGuideSheets(workbook)

  const sheets = Object.fromEntries(PRODUCT_TABS.map((tab) => [tab, addProductSheet(workbook, tab)])) as Record<(typeof PRODUCT_TABS)[number], ExcelJS.Worksheet>
  const rowCounters = Object.fromEntries(PRODUCT_TABS.map((tab) => [tab, 1])) as Record<(typeof PRODUCT_TABS)[number], number>

  for (const product of (productsResult.data ?? []) as ProductRow[]) {
    const categoryName = categoryNames.get(product.main_category_id ?? '') ?? ''
    const primarySubcategory = subcategoryNames.get(product.subcategory_id ?? '') ?? ''
    const primaryOption = optionNames.get(product.option_id ?? '') ?? ''
    const tab = chooseTab(product, primarySubcategory, categoryName)

    const linkedSubcategories = (linkedSubcategoriesByProduct.get(product.id) ?? [])
      .filter((entry) => !entry.is_primary)
      .map((entry) => subcategoryNames.get(entry.subcategory_id) ?? '')
    const linkedOptions = (linkedOptionsByProduct.get(product.id) ?? [])
      .filter((entry) => !entry.is_primary)
      .map((entry) => optionNames.get(entry.option_id) ?? '')
    const shapeValues = (shapesByProduct.get(product.id) ?? []).map((entry) => shapeNames.get(entry.shape_id) ?? '')
    const materialValues = (materialsByProduct.get(product.id) ?? []).map((entry) => materialNames.get(entry.material_value_id) ?? '')

    const variants = variantsByProduct.get(product.id) ?? []
    const selectedMetals = (metalsByProduct.get(product.id) ?? []).map((entry) => metalNames.get(entry.metal_id) ?? '')
    const fallbackImages = unique(compact([
      toPublicUrl(product.image_1_path),
      toPublicUrl(product.image_2_path),
      toPublicUrl(product.image_3_path),
      toPublicUrl(product.image_4_path),
      ...(fallbackMediaByProduct.get(product.id) ?? []).filter((item) => item.media_type === 'image').map((item) => toPublicUrl(item.media_path)),
    ]))
    const fallbackVideos = unique(compact([
      toPublicUrl(product.video_path),
      ...(fallbackMediaByProduct.get(product.id) ?? []).filter((item) => item.media_type === 'video').map((item) => toPublicUrl(item.media_path)),
    ]))

    const variantLabels = variants.map((variant) => metalNames.get(variant.metal_id) ?? '').filter(Boolean)
    const variantPrices = variants.map((variant) => priceText(variant.price)).filter(Boolean)
    const variantImageGroups = variants.map((variant) =>
      (mediaByVariant.get(variant.id) ?? []).filter((item) => item.media_type === 'image').map((item) => toPublicUrl(item.media_path))
    )
    const variantVideoGroups = variants.map((variant) =>
      (mediaByVariant.get(variant.id) ?? []).filter((item) => item.media_type === 'video').map((item) => toPublicUrl(item.media_path))
    )
    const displayImages = fallbackImages.length > 0 ? fallbackImages : unique(firstFilledGroup(variantImageGroups))
    const displayVideos = fallbackVideos.length > 0 ? fallbackVideos : unique(firstFilledGroup(variantVideoGroups))
    const purityRows = pricesByProduct.get(product.id) ?? []
    const faq = faqsByProduct.get(product.id)?.[0]

    const sheet = sheets[tab]
    sheet.addRow([
      rowCounters[tab],
      formatDate(product.created_at),
      valueText(product.sku),
      displayImages.join(','),
      categoryName,
      unique([primarySubcategory, ...linkedSubcategories]).join('|'),
      unique([primaryOption, ...linkedOptions]).join('|'),
      unique(shapeValues).join(', '),
      '',
      unique(materialValues).join(', '),
      styleNames.get(product.style_id ?? '') ?? '',
      valueText(product.sku),
      product.name ?? '',
      product.description ?? '',
      variantLabels.length > 0 ? variantLabels.join('|') : unique(selectedMetals).join('|'),
      variantPrices.length > 0 ? variantPrices.join('|') : purityRows.map((row) => priceText(row.price)).filter(Boolean).join('|'),
      groupedJoin(variantImageGroups) || displayImages.join(','),
      groupedJoin(variantVideoGroups) || displayVideos.join(','),
      priceText(product.discount_price),
      faq?.question ?? '',
      faq?.answer ?? '',
    ])
    rowCounters[tab] += 1
  }

  for (const tab of PRODUCT_TABS) {
    const sheet = sheets[tab]
    for (let rowNumber = 6; rowNumber <= sheet.rowCount; rowNumber += 1) {
      sheet.getRow(rowNumber).alignment = { vertical: 'top', wrapText: true }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="house-of-diams-latest-wide-products-${today}.xlsx"`,
      'cache-control': 'no-store',
    },
  })
}
