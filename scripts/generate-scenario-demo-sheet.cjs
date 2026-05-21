const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')
const { createClient } = require('@supabase/supabase-js')

const ROOT_DIR = path.join(__dirname, '..', '..')
const ADMIN_DIR = path.join(ROOT_DIR, 'admin')
const SOURCE_WORKBOOK = 'C:/Users/user/Downloads/DCB-Akshar (1).xlsx'
const OUTPUT_DIR = path.join(ROOT_DIR, 'client-product-creation-sheet')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'DCB-Akshar-Clean-Scenario-Workbook.xlsx')
const PRODUCT_TABS = ['Ring_Final', 'Earring_Final', 'Pendant_Final', 'BrcBg']

const PRODUCT_COLUMNS = [
  { key: 'No', sourceHeader: 'No' },
  { key: 'Upload Date', sourceHeader: 'Upload Date' },
  { key: 'SKU', sourceHeader: 'SKU' },
  { key: 'Image', sourceHeader: 'Image' },
  { key: 'Category', sourceHeader: 'Category' },
  { key: 'Sub-Cat.', sourceHeader: 'Sub-Cat.' },
  { key: 'Option', sourceHeader: 'Sub-Cat.' },
  { key: 'By Shape', sourceHeader: 'By Shape' },
  { key: 'Gender', sourceHeader: 'Gender' },
  { key: 'Material', sourceHeader: 'Material' },
  { key: 'Style', sourceHeader: 'Design Theme' },
  { key: 'Style No.', sourceHeader: 'Style No.' },
  { key: 'Title', sourceHeader: 'Title' },
  { key: 'Description', sourceHeader: 'Description' },
  { key: 'Metal', sourceHeader: 'Col' },
  { key: 'Variant Prices', sourceHeader: 'KT Code' },
  { key: 'Variant Images', sourceHeader: 'KT/Col' },
  { key: 'Variant Videos', sourceHeader: 'KT/Col' },
  { key: 'NSP Price', sourceHeader: 'NSP Price' },
]

function readEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

function createSupabase() {
  const env = readEnv(path.join(ADMIN_DIR, '.env.local'))
  return {
    client: createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }),
    r2BaseUrl: String(env.CLOUDFLARE_R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, ''),
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function copyCell(sourceCell, targetCell) {
  targetCell.value = clone(sourceCell.value)
  targetCell.style = clone(sourceCell.style || {})
  if (sourceCell.note) targetCell.note = clone(sourceCell.note)
  if (sourceCell.numFmt) targetCell.numFmt = sourceCell.numFmt
}

function toPublicUrl(value, r2BaseUrl) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  return r2BaseUrl ? `${r2BaseUrl}/${text.replace(/^\/+/, '')}` : text
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function buildCombinedMetalDisplayLabel(metal) {
  const name = String(metal.name || '').trim()
  const purity = String(metal.purity_label || '').trim()
  const baseMetalName = String(metal.base_metal_name || name).trim()
  const displayLabel = String(metal.display_label || '').trim()
  if (displayLabel && (!purity || (displayLabel !== name && displayLabel !== baseMetalName))) return displayLabel
  return purity ? `${purity} ${baseMetalName}`.trim() : baseMetalName
}

async function fetchData(supabase) {
  const [
    categoriesResult,
    subcategoriesResult,
    optionsResult,
    stylesResult,
    materialsResult,
    shapesResult,
    metalsResult,
    productsResult,
    metalVariantsResult,
    variantMediaResult,
  ] = await Promise.all([
    supabase.from('catalog_categories').select('id,name,display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_subcategories').select('id,name,category_id,display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_options').select('id,name,subcategory_id,display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_styles').select('id,name,display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_material_values').select('id,name,display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_stone_shapes').select('id,name,display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_metals').select('id,name,purity_label,base_metal_name,display_label,display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('products').select('id,sku,name,description,image_1_path,image_2_path,image_3_path,image_4_path,video_path,discount_price,base_price').eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('product_metal_variants').select('id,product_id,metal_id,is_default,sort_order,price').order('sort_order', { ascending: true }),
    supabase.from('product_variant_media_items').select('product_id,variant_id,media_type,media_path,sort_order,is_default_fallback').order('sort_order', { ascending: true }),
  ])

  for (const result of [categoriesResult, subcategoriesResult, optionsResult, stylesResult, materialsResult, shapesResult, metalsResult, productsResult, metalVariantsResult, variantMediaResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  return {
    categories: categoriesResult.data || [],
    subcategories: subcategoriesResult.data || [],
    options: optionsResult.data || [],
    styles: stylesResult.data || [],
    materials: materialsResult.data || [],
    shapes: shapesResult.data || [],
    metals: metalsResult.data || [],
    products: productsResult.data || [],
    metalVariants: metalVariantsResult.data || [],
    variantMediaItems: variantMediaResult.data || [],
  }
}

function buildLookups(data, r2BaseUrl) {
  const categoryByName = new Map(data.categories.map((row) => [row.name, row]))
  const subcategoryByName = new Map(data.subcategories.map((row) => [row.name, row]))
  const optionByName = new Map(data.options.map((row) => [row.name, row]))
  const styleByName = new Map(data.styles.map((row) => [row.name, row]))
  const materialByName = new Map(data.materials.map((row) => [row.name, row]))
  const shapeByName = new Map(data.shapes.map((row) => [row.name, row]))
  const metalLabels = data.metals.map((row) => ({ ...row, label: buildCombinedMetalDisplayLabel(row) }))
  const metalByLabel = new Map(metalLabels.map((row) => [row.label, row]))

  const mediaByVariantId = new Map()
  const fallbackMediaByProduct = new Map()
  data.variantMediaItems.forEach((row) => {
    if (row.variant_id) mediaByVariantId.set(row.variant_id, [...(mediaByVariantId.get(row.variant_id) || []), row])
    else if (row.is_default_fallback) fallbackMediaByProduct.set(row.product_id, [...(fallbackMediaByProduct.get(row.product_id) || []), row])
  })

  const variantsByProduct = new Map()
  data.metalVariants.forEach((row) => {
    variantsByProduct.set(row.product_id, [...(variantsByProduct.get(row.product_id) || []), row])
  })

  const mediaPool = []
  const videoPool = []
  for (const product of data.products) {
    const directImages = [product.image_1_path, product.image_2_path, product.image_3_path, product.image_4_path]
      .map((entry) => toPublicUrl(entry, r2BaseUrl))
      .filter(Boolean)
    const directVideo = toPublicUrl(product.video_path, r2BaseUrl)

    const fallbackMedia = fallbackMediaByProduct.get(product.id) || []
    const fallbackImages = fallbackMedia.filter((row) => row.media_type === 'image').map((row) => toPublicUrl(row.media_path, r2BaseUrl))
    const fallbackVideos = fallbackMedia.filter((row) => row.media_type === 'video').map((row) => toPublicUrl(row.media_path, r2BaseUrl))

    const variantMedia = (variantsByProduct.get(product.id) || []).flatMap((variant) => mediaByVariantId.get(variant.id) || [])
    const variantImages = variantMedia.filter((row) => row.media_type === 'image').map((row) => toPublicUrl(row.media_path, r2BaseUrl))
    const variantVideos = variantMedia.filter((row) => row.media_type === 'video').map((row) => toPublicUrl(row.media_path, r2BaseUrl))

    mediaPool.push(...directImages, ...fallbackImages, ...variantImages)
    if (directVideo) videoPool.push(directVideo)
    videoPool.push(...fallbackVideos, ...variantVideos)
  }

  return {
    categoryByName,
    subcategoryByName,
    optionByName,
    styleByName,
    materialByName,
    shapeByName,
    metalByLabel,
    mediaPool: unique(mediaPool),
    videoPool: unique(videoPool),
  }
}

function requireLookup(map, name, kind) {
  const value = map.get(name)
  if (!value) throw new Error(`Missing ${kind} in live DB: ${name}`)
  return value
}

function pickMedia(pool, start, count) {
  const result = []
  for (let index = 0; index < count; index += 1) {
    result.push(pool[(start + index) % pool.length])
  }
  return result
}

function buildScenarioRows(lookups) {
  // Ensure every demonstrated master value truly exists.
  ;[
    ['category', 'Engagement Rings'],
    ['category', 'Fine Jewellery'],
    ['subcategory', 'Round rings'],
    ['subcategory', 'star diamond'],
    ['subcategory', 'Earrings'],
    ['subcategory', 'Necklaces'],
    ['subcategory', 'Bracelet'],
    ['option', 'Stud Earrings'],
    ['option', 'Drop & Dangle'],
    ['option', 'Hoops & Huggies  '],
    ['option', 'Solitare'],
    ['option', 'Teardrop '],
    ['option', 'Charm Necklace'],
    ['option', 'Tennis'],
    ['option', 'Bangles'],
    ['style', 'Classic'],
    ['style', 'Halo'],
    ['style', 'Bezel'],
    ['material', 'Natural Diamond'],
    ['material', 'Lab Grown Diamond'],
    ['shape', 'Round'],
    ['shape', 'Oval'],
    ['shape', 'Pear'],
    ['shape', 'Emerald'],
    ['metal', '14k White Gold'],
    ['metal', '14K Yellow Gold'],
    ['metal', '18K Rose gold'],
    ['metal', '10K White Gold'],
  ].forEach(([kind, name]) => {
    if (kind === 'category') requireLookup(lookups.categoryByName, name, kind)
    if (kind === 'subcategory') requireLookup(lookups.subcategoryByName, name, kind)
    if (kind === 'option') requireLookup(lookups.optionByName, name, kind)
    if (kind === 'style') requireLookup(lookups.styleByName, name, kind)
    if (kind === 'material') requireLookup(lookups.materialByName, name, kind)
    if (kind === 'shape') requireLookup(lookups.shapeByName, name, kind)
    if (kind === 'metal') requireLookup(lookups.metalByLabel, name, kind)
  })

  const img = (start, count) => pickMedia(lookups.mediaPool, start, count).join(',')
  const vid = (start, count = 1) => pickMedia(lookups.videoPool, start, count).join(',')

  return {
    Ring_Final: [
      {
        code: 'RING-S1',
        title: 'Single Combined Metal Ring',
        situations: ['single combined metal', 'single price', 'single image group', 'single video group'],
        values: {
          sku: 'RING-S1-001',
          category: 'Engagement Rings',
          subcategory: 'Round rings',
          option: '',
          shape: 'Round',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Classic',
          title: 'Demo Ring Single Metal',
          description: 'Demonstrates one combined metal option with one price and one media set.',
          metal: '14K Yellow Gold',
          variantPrices: '128000',
          variantImages: img(0, 3),
          variantVideos: vid(0),
          nspPrice: '124500',
        },
      },
      {
        code: 'RING-S2',
        title: 'Multi Metal Variant Ring',
        situations: ['multiple combined metals', 'grouped prices', 'grouped images', 'grouped videos'],
        values: {
          sku: 'RING-S2-001',
          category: 'Engagement Rings',
          subcategory: 'star diamond',
          option: '',
          shape: 'Oval',
          gender: 'Women',
          material: 'Natural Diamond, Lab Grown Diamond',
          style: 'Halo',
          title: 'Demo Ring Multi Variant',
          description: 'Demonstrates three combined metal options with aligned price, image, and video groups.',
          metal: '14k White Gold|18K Rose gold|10K White Gold',
          variantPrices: '132000|139500|125000',
          variantImages: `${img(3, 2)}|${img(5, 2)}|${img(7, 2)}`,
          variantVideos: `${vid(1)}|${vid(2)}|${vid(3)}`,
          nspPrice: '129500',
        },
      },
      {
        code: 'RING-S3',
        title: 'Dual Subcategory Ring',
        situations: ['dual subcategory linking via "|"', 'multiple shapes', 'single metal with linked placement'],
        values: {
          sku: 'RING-S3-001',
          category: 'Engagement Rings',
          subcategory: 'Round rings|star diamond',
          option: '',
          shape: 'Round, Oval',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Classic',
          title: 'Demo Ring Linked Subcategories',
          description: 'Demonstrates linked subcategory placement in one row for the same engagement ring.',
          metal: '14k White Gold',
          variantPrices: '131000',
          variantImages: img(9, 3),
          variantVideos: vid(4),
          nspPrice: '127900',
        },
      },
      {
        code: 'RING-S4',
        title: 'Multi Material Ring',
        situations: ['multiple material values', 'multiple shapes comma-separated', 'single combined metal'],
        values: {
          sku: 'RING-S4-001',
          category: 'Engagement Rings',
          subcategory: 'Round rings',
          option: '',
          shape: 'Pear, Emerald',
          gender: 'Women',
          material: 'Natural Diamond, Lab Grown Diamond',
          style: 'Bezel',
          title: 'Demo Ring Multi Material',
          description: 'Demonstrates comma-separated material and shape values with one combined metal option.',
          metal: '18K Rose gold',
          variantPrices: '141000',
          variantImages: img(12, 3),
          variantVideos: vid(5),
          nspPrice: '137000',
        },
      },
    ],
    Earring_Final: [
      {
        code: 'EAR-S1',
        title: 'Stud Earring Baseline',
        situations: ['single option', 'single combined metal'],
        values: {
          sku: 'EAR-S1-001',
          category: 'Fine Jewellery',
          subcategory: 'Earrings',
          option: 'Stud Earrings',
          shape: 'Round',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Classic',
          title: 'Demo Stud Earring',
          description: 'Demonstrates a clean baseline earring row with one option and one combined metal.',
          metal: '14k White Gold',
          variantPrices: '54000',
          variantImages: img(15, 2),
          variantVideos: vid(0),
          nspPrice: '52000',
        },
      },
      {
        code: 'EAR-S2',
        title: 'Linked Earring Options',
        situations: ['multi option linking via "|"', 'single subcategory with linked options'],
        values: {
          sku: 'EAR-S2-001',
          category: 'Fine Jewellery',
          subcategory: 'Earrings',
          option: 'Stud Earrings|Drop & Dangle',
          shape: 'Round, Pear',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Halo',
          title: 'Demo Linked Earring Options',
          description: 'Demonstrates multiple linked options within the Earrings subcategory.',
          metal: '14K Yellow Gold',
          variantPrices: '58500',
          variantImages: img(17, 2),
          variantVideos: vid(1),
          nspPrice: '56000',
        },
      },
      {
        code: 'EAR-S3',
        title: 'Hoops Multi Variant',
        situations: ['multi options', 'multiple combined metals', 'grouped image sets'],
        values: {
          sku: 'EAR-S3-001',
          category: 'Fine Jewellery',
          subcategory: 'Earrings',
          option: 'Hoops & Huggies  |Drop & Dangle',
          shape: 'Oval',
          gender: 'Women',
          material: 'Lab Grown Diamond',
          style: 'Bezel',
          title: 'Demo Hoops Multi Variant',
          description: 'Demonstrates earring options with two combined metal variants and aligned media groups.',
          metal: '14k White Gold|18K Rose gold',
          variantPrices: '61000|64250',
          variantImages: `${img(19, 2)}|${img(21, 2)}`,
          variantVideos: `${vid(2)}|${vid(3)}`,
          nspPrice: '59500',
        },
      },
    ],
    Pendant_Final: [
      {
        code: 'PEND-S0',
        title: 'Pendant Baseline',
        situations: ['single option', 'single combined metal', 'simple fallback image usage'],
        values: {
          sku: 'PEND-S0-001',
          category: 'Fine Jewellery',
          subcategory: 'Necklaces',
          option: 'Solitare',
          shape: 'Round',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Classic',
          title: 'Demo Pendant Baseline',
          description: 'Demonstrates the simplest necklace row with one option, one metal, and one media set.',
          metal: '14k White Gold',
          variantPrices: '70500',
          variantImages: img(22, 2),
          variantVideos: vid(4),
          nspPrice: '68900',
        },
      },
      {
        code: 'PEND-S1',
        title: 'Linked Pendant Options',
        situations: ['multiple options under Necklaces', 'single combined metal'],
        values: {
          sku: 'PEND-S1-001',
          category: 'Fine Jewellery',
          subcategory: 'Necklaces',
          option: 'Solitare|Teardrop |Charm Necklace',
          shape: 'Pear',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Classic',
          title: 'Demo Pendant Linked Options',
          description: 'Demonstrates linked options within the Necklaces subcategory.',
          metal: '14K Yellow Gold',
          variantPrices: '72000',
          variantImages: img(23, 3),
          variantVideos: vid(4),
          nspPrice: '69900',
        },
      },
      {
        code: 'PEND-S2',
        title: 'Pendant Multi Variant',
        situations: ['multiple combined metals', 'grouped prices/images/videos'],
        values: {
          sku: 'PEND-S2-001',
          category: 'Fine Jewellery',
          subcategory: 'Necklaces',
          option: 'Solitare',
          shape: 'Emerald',
          gender: 'Women',
          material: 'Lab Grown Diamond',
          style: 'Bezel',
          title: 'Demo Pendant Multi Variant',
          description: 'Demonstrates two combined metal variants with separate media groups for pendant testing.',
          metal: '14k White Gold|18K Rose gold',
          variantPrices: '74800|78900',
          variantImages: `${img(26, 2)}|${img(28, 2)}`,
          variantVideos: `${vid(5)}|${vid(0)}`,
          nspPrice: '73500',
        },
      },
    ],
    BrcBg: [
      {
        code: 'BRC-S0',
        title: 'Bracelet Baseline',
        situations: ['single bracelet option', 'single combined metal'],
        values: {
          sku: 'BRC-S0-001',
          category: 'Fine Jewellery',
          subcategory: 'Bracelet',
          option: 'Tennis',
          shape: 'Round',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Classic',
          title: 'Demo Bracelet Baseline',
          description: 'Demonstrates the simplest bracelet row with one option and one combined metal.',
          metal: '14K Yellow Gold',
          variantPrices: '81200',
          variantImages: img(30, 2),
          variantVideos: vid(1),
          nspPrice: '79800',
        },
      },
      {
        code: 'BRC-S1',
        title: 'Bracelet Linked Options',
        situations: ['multiple options in Bracelet', 'multiple combined metals', 'grouped media'],
        values: {
          sku: 'BRC-S1-001',
          category: 'Fine Jewellery',
          subcategory: 'Bracelet',
          option: 'Tennis|Bangles',
          shape: 'Round',
          gender: 'Women',
          material: 'Natural Diamond',
          style: 'Classic',
          title: 'Demo Bracelet Linked Options',
          description: 'Demonstrates bracelet option linking and grouped combined metal media setup.',
          metal: '14K Yellow Gold|18K Rose gold',
          variantPrices: '83500|87200',
          variantImages: `${img(30, 2)}|${img(32, 2)}`,
          variantVideos: `${vid(1)}|${vid(2)}`,
          nspPrice: '81900',
        },
      },
      {
        code: 'BRC-S2',
        title: 'Bracelet Multi Metal',
        situations: ['single option', 'multiple combined metals', 'pipe-separated grouped media and price'],
        values: {
          sku: 'BRC-S2-001',
          category: 'Fine Jewellery',
          subcategory: 'Bracelet',
          option: 'Bangles',
          shape: 'Round',
          gender: 'Women',
          material: 'Lab Grown Diamond',
          style: 'Bezel',
          title: 'Demo Bracelet Multi Metal',
          description: 'Demonstrates one bracelet option with two metal variants using pipe-separated prices and media.',
          metal: '14k White Gold|18K Rose gold',
          variantPrices: '84600|88900',
          variantImages: `${img(34, 2)}|${img(36, 2)}`,
          variantVideos: `${vid(2)}|${vid(3)}`,
          nspPrice: '83200',
        },
      },
    ],
  }
}

function addGuideSheet(workbook, scenarioRows) {
  const rulesSheet = workbook.addWorksheet('How To Use')
  rulesSheet.columns = [
    { header: 'Column', key: 'column', width: 24 },
    { header: 'How To Fill', key: 'rule', width: 80 },
    { header: 'Example', key: 'example', width: 80 },
  ]
  rulesSheet.getRow(1).font = { bold: true }
  ;[
    ['SKU', 'Use a unique SKU for each row so it stages as a new product and does not update a live one.', 'RING-S2-001'],
    ['Category', 'Use the exact category master name from House of Diams.', 'Engagement Rings'],
    ['Sub-Cat.', 'Use one subcategory, or link multiple subcategories with |.', 'Round rings|star diamond'],
    ['Option', 'Use one option, or link multiple options with |.', 'Stud Earrings|Drop & Dangle'],
    ['By Shape', 'Use one shape or multiple shapes with commas.', 'Round, Oval'],
    ['Material', 'Use exact material master values. Multiple materials use commas.', 'Natural Diamond, Lab Grown Diamond'],
    ['Style', 'Use the exact style master name.', 'Classic'],
    ['Metal', 'Use the combined metal master values. Multiple sellable options use | in the same order as prices/media.', '14k White Gold|18K Rose gold'],
    ['Variant Prices', 'One price for each Metal entry, in the same order, separated by |.', '132000|139500'],
    ['Variant Images', 'One image group per Metal entry. Inside a group use commas, between groups use |.', 'img1,img2|img3,img4'],
    ['Variant Videos', 'One video group per Metal entry. Inside a group use commas, between groups use |.', 'vid1|vid2,vid3'],
    ['Image', 'Fallback/main image list. Usually keep the first metal group here too.', 'img1,img2,img3'],
  ].forEach(([column, rule, example]) => rulesSheet.addRow({ column, rule, example }))

  const sheet = workbook.addWorksheet('Scenario Guide')
  sheet.columns = [
    { header: 'Tab', key: 'tab', width: 18 },
    { header: 'Scenario Code', key: 'code', width: 18 },
    { header: 'Demo Title', key: 'title', width: 32 },
    { header: 'What It Demonstrates', key: 'situations', width: 90 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const [tabName, rows] of Object.entries(scenarioRows)) {
    for (const row of rows) {
      sheet.addRow({
        tab: tabName,
        code: row.code,
        title: row.title,
        situations: row.situations.join('; '),
      })
    }
  }
}

function headerMap(worksheet, rowNumber) {
  const map = new Map()
  const values = worksheet.getRow(rowNumber).values
  for (let index = 1; index < values.length; index += 1) {
    const text = String(values[index] || '').trim()
    if (!text) continue
    if (!map.has(text)) map.set(text, [])
    map.get(text).push(index)
  }
  return map
}

function createProductSheet(sourceWorkbook, targetWorkbook, sheetName) {
  const source = sourceWorkbook.getWorksheet(sheetName)
  const sourceHeaderMap = headerMap(source, 5)
  const target = targetWorkbook.addWorksheet(sheetName, {
    views: clone(source.views),
    pageSetup: clone(source.pageSetup),
    properties: clone(source.properties),
  })

  PRODUCT_COLUMNS.forEach((column, index) => {
    const sourceIndex = (sourceHeaderMap.get(column.sourceHeader) || [1])[0]
    const sourceCol = source.getColumn(sourceIndex)
    const targetCol = target.getColumn(index + 1)
    targetCol.width = sourceCol.width || 18
    targetCol.style = clone(sourceCol.style || {})
  })

  for (let rowNumber = 1; rowNumber <= 5; rowNumber += 1) {
    const sourceRow = source.getRow(rowNumber)
    const targetRow = target.getRow(rowNumber)
    targetRow.height = sourceRow.height
    PRODUCT_COLUMNS.forEach((column, index) => {
      const sourceIndex = (sourceHeaderMap.get(column.sourceHeader) || [1])[0]
      const sourceCell = sourceRow.getCell(sourceIndex)
      const targetCell = targetRow.getCell(index + 1)
      copyCell(sourceCell, targetCell)
      if (rowNumber === 4 && ['Metal', 'Variant Prices', 'Variant Images', 'Variant Videos'].includes(column.key)) {
        targetCell.value = 'Variants'
      }
      if (rowNumber === 5) targetCell.value = column.key
    })
    targetRow.commit()
  }

  return target
}

function fillProductSheet(worksheet, scenarioRows) {
  scenarioRows.forEach((scenario, rowIndex) => {
    const rowNumber = 6 + rowIndex
    const row = worksheet.getRow(rowNumber)
    const templateRow = worksheet.getRow(6)
    row.height = templateRow.height

    const primaryImage = String(scenario.values.variantImages || '').split('|')[0] || ''

    const valueMap = {
      'No': rowIndex + 1,
      'Upload Date': '21/05/2026',
      'SKU': scenario.values.sku,
      'Image': primaryImage,
      'Category': scenario.values.category,
      'Sub-Cat.': scenario.values.subcategory,
      'Option': scenario.values.option,
      'By Shape': scenario.values.shape,
      'Gender': scenario.values.gender,
      'Material': scenario.values.material,
      'Style': scenario.values.style,
      'Style No.': scenario.code,
      'Title': scenario.values.title,
      'Description': scenario.values.description,
      'Metal': scenario.values.metal,
      'Variant Prices': scenario.values.variantPrices,
      'Variant Images': scenario.values.variantImages,
      'Variant Videos': scenario.values.variantVideos,
      'NSP Price': scenario.values.nspPrice,
    }

    PRODUCT_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1)
      cell.style = clone(templateRow.getCell(columnIndex + 1).style || {})
      cell.value = valueMap[column.key] || ''
    })
    row.commit()
  })
}

async function main() {
  const { client: supabase, r2BaseUrl } = createSupabase()
  const data = await fetchData(supabase)
  const lookups = buildLookups(data, r2BaseUrl)
  const scenarioRows = buildScenarioRows(lookups)

  const sourceWorkbook = new ExcelJS.Workbook()
  await sourceWorkbook.xlsx.readFile(SOURCE_WORKBOOK)

  const targetWorkbook = new ExcelJS.Workbook()
  targetWorkbook.creator = 'OpenAI Codex'
  targetWorkbook.created = new Date()

  addGuideSheet(targetWorkbook, scenarioRows)
  PRODUCT_TABS.forEach((sheetName) => createProductSheet(sourceWorkbook, targetWorkbook, sheetName))
  PRODUCT_TABS.forEach((sheetName) => fillProductSheet(targetWorkbook.getWorksheet(sheetName), scenarioRows[sheetName] || []))

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  await targetWorkbook.xlsx.writeFile(OUTPUT_FILE)
  console.log(OUTPUT_FILE)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
