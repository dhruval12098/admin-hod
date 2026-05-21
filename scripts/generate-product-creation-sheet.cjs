const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')
const { createClient } = require('@supabase/supabase-js')

const ROOT_DIR = path.join(__dirname, '..', '..')
const ADMIN_DIR = path.join(ROOT_DIR, 'admin')
const SOURCE_WORKBOOK = 'C:/Users/user/Downloads/DCB-Akshar (1).xlsx'
const OUTPUT_DIR = path.join(ROOT_DIR, 'client-product-creation-sheet')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'DCB-Akshar-Product-Creation-Sheet.xlsx')
const PRODUCT_TABS = ['Ring_Final', 'Earring_Final', 'Pendant_Final', 'BrcBg']
const DUMMY_UPLOAD_DATE = '21/05/2026'
const DUMMY_GENDER = 'Women'
const DUMMY_STYLE = 'Classic'
const DUMMY_SHAPE = 'Round'
const DUMMY_MATERIAL = 'Natural Diamond'
const DUMMY_VIDEO_URL = 'https://pub-0ea48ff8bc25421e949ac1de2d305b1a.r2.dev/video/010.mp4'
const DUMMY_METAL = '14K Yellow Gold'

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

function stringifyPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return ''
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function detectTab(product) {
  if (product.categoryName === 'Engagement Rings') return 'Ring_Final'
  if (product.subcategoryName === 'Earrings') return 'Earring_Final'
  if (product.subcategoryName === 'Necklaces') return 'Pendant_Final'
  if (product.subcategoryName === 'Bracelet') return 'BrcBg'
  return null
}

function scoreProduct(product) {
  return (
    product.variantRows.length * 10 +
    product.variantRows.reduce((sum, row) => sum + row.images.length * 2 + row.videos.length * 3, 0) +
    product.optionNames.length * 2 +
    product.shapeNames.length * 2 +
    product.materialNames.length * 2
  )
}

function pickVariedProducts(products, count) {
  const sorted = [...products].sort((a, b) => scoreProduct(b) - scoreProduct(a))
  const selected = []
  const seenOptions = new Set()
  const seenShapes = new Set()

  for (const product of sorted) {
    const optionKey = product.optionName || '__blank__'
    if (!seenOptions.has(optionKey)) {
      selected.push(product)
      seenOptions.add(optionKey)
      seenShapes.add(product.shapeNames.join('|'))
      if (selected.length >= count) return selected
    }
  }

  for (const product of sorted) {
    if (selected.includes(product)) continue
    const shapeKey = product.shapeNames.join('|') || '__blank__'
    if (!seenShapes.has(shapeKey)) {
      selected.push(product)
      seenShapes.add(shapeKey)
      if (selected.length >= count) return selected
    }
  }

  for (const product of sorted) {
    if (selected.includes(product)) continue
    selected.push(product)
    if (selected.length >= count) return selected
  }

  return selected
}

async function fetchAllData(supabase) {
  const [
    categoriesResult,
    subcategoriesResult,
    optionsResult,
    stylesResult,
    materialsResult,
    shapesResult,
    metalsResult,
    productsResult,
    materialSelectionsResult,
    shapeSelectionsResult,
    subcategoryLinksResult,
    optionLinksResult,
    metalVariantsResult,
    variantMediaResult,
  ] = await Promise.all([
    supabase.from('catalog_categories').select('id,name').eq('status', 'active'),
    supabase.from('catalog_subcategories').select('id,name,category_id').eq('status', 'active'),
    supabase.from('catalog_options').select('id,name,subcategory_id').eq('status', 'active'),
    supabase.from('catalog_styles').select('id,name').eq('status', 'active'),
    supabase.from('catalog_material_values').select('id,name').eq('status', 'active'),
    supabase.from('catalog_stone_shapes').select('id,name').eq('status', 'active'),
    supabase.from('catalog_metals').select('id,name,purity_label,base_metal_name,display_label').eq('status', 'active'),
    supabase.from('products').select('id,name,sku,description,main_category_id,subcategory_id,option_id,style_id,wedding_gender,image_1_path,image_2_path,image_3_path,image_4_path,video_path,base_price,discount_price,status').eq('status', 'active'),
    supabase.from('product_material_value_selections').select('product_id,material_value_id,sort_order').order('sort_order', { ascending: true }),
    supabase.from('product_stone_shapes').select('product_id,shape_id'),
    supabase.from('product_subcategory_links').select('product_id,subcategory_id,sort_order').order('sort_order', { ascending: true }),
    supabase.from('product_option_links').select('product_id,option_id,sort_order').order('sort_order', { ascending: true }),
    supabase.from('product_metal_variants').select('id,product_id,metal_id,price,is_default,sort_order').order('sort_order', { ascending: true }),
    supabase.from('product_variant_media_items').select('product_id,variant_id,media_type,media_path,sort_order,is_default_fallback').order('sort_order', { ascending: true }),
  ])

  const results = [
    categoriesResult,
    subcategoriesResult,
    optionsResult,
    stylesResult,
    materialsResult,
    shapesResult,
    metalsResult,
    productsResult,
    materialSelectionsResult,
    shapeSelectionsResult,
    subcategoryLinksResult,
    optionLinksResult,
    metalVariantsResult,
    variantMediaResult,
  ]
  for (const result of results) {
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
    materialSelections: materialSelectionsResult.data || [],
    shapeSelections: shapeSelectionsResult.data || [],
    subcategoryLinks: subcategoryLinksResult.data || [],
    optionLinks: optionLinksResult.data || [],
    metalVariants: metalVariantsResult.data || [],
    variantMediaItems: variantMediaResult.data || [],
  }
}

function normalizeProducts(data) {
  const categoryById = new Map(data.categories.map((row) => [row.id, row.name]))
  const subcategoryById = new Map(data.subcategories.map((row) => [row.id, row.name]))
  const optionById = new Map(data.options.map((row) => [row.id, row.name]))
  const styleById = new Map(data.styles.map((row) => [row.id, row.name]))
  const materialById = new Map(data.materials.map((row) => [row.id, row.name]))
  const shapeById = new Map(data.shapes.map((row) => [row.id, row.name]))
  const metalById = new Map(data.metals.map((row) => [row.id, row]))

  const materialsByProduct = new Map()
  data.materialSelections.forEach((row) => {
    materialsByProduct.set(row.product_id, [...(materialsByProduct.get(row.product_id) || []), materialById.get(row.material_value_id) || ''])
  })

  const shapesByProduct = new Map()
  data.shapeSelections.forEach((row) => {
    shapesByProduct.set(row.product_id, [...(shapesByProduct.get(row.product_id) || []), shapeById.get(row.shape_id) || ''])
  })

  const linkedSubcategoriesByProduct = new Map()
  data.subcategoryLinks.forEach((row) => {
    linkedSubcategoriesByProduct.set(row.product_id, [...(linkedSubcategoriesByProduct.get(row.product_id) || []), subcategoryById.get(row.subcategory_id) || ''])
  })

  const linkedOptionsByProduct = new Map()
  data.optionLinks.forEach((row) => {
    linkedOptionsByProduct.set(row.product_id, [...(linkedOptionsByProduct.get(row.product_id) || []), optionById.get(row.option_id) || ''])
  })

  const mediaByVariantId = new Map()
  const fallbackMediaByProduct = new Map()
  data.variantMediaItems.forEach((row) => {
    if (row.variant_id) {
      mediaByVariantId.set(row.variant_id, [...(mediaByVariantId.get(row.variant_id) || []), row])
    } else if (row.is_default_fallback) {
      fallbackMediaByProduct.set(row.product_id, [...(fallbackMediaByProduct.get(row.product_id) || []), row])
    }
  })

  const variantsByProduct = new Map()
  data.metalVariants.forEach((row) => {
    variantsByProduct.set(row.product_id, [...(variantsByProduct.get(row.product_id) || []), row])
  })

  return data.products
    .map((product) => {
      const variantRows = (variantsByProduct.get(product.id) || []).map((variant) => {
        const metal = metalById.get(variant.metal_id)
        const media = mediaByVariantId.get(variant.id) || []
        return {
          label: metal ? buildCombinedMetalDisplayLabel(metal) : '',
          price: stringifyPrice(variant.price),
          is_default: Boolean(variant.is_default),
          sort_order: Number(variant.sort_order || 0),
          images: media.filter((row) => row.media_type === 'image').map((row) => row.media_path),
          videos: media.filter((row) => row.media_type === 'video').map((row) => row.media_path),
        }
      }).filter((row) => row.label).sort((a,b) => a.sort_order - b.sort_order)

      return {
        ...product,
        categoryName: categoryById.get(product.main_category_id) || '',
        subcategoryName: subcategoryById.get(product.subcategory_id) || '',
        optionName: optionById.get(product.option_id) || '',
        styleName: styleById.get(product.style_id) || '',
        materialNames: unique((materialsByProduct.get(product.id) || []).filter(Boolean)),
        shapeNames: unique((shapesByProduct.get(product.id) || []).filter(Boolean)),
        subcategoryNames: unique([subcategoryById.get(product.subcategory_id) || '', ...(linkedSubcategoriesByProduct.get(product.id) || [])].filter(Boolean)),
        optionNames: unique([optionById.get(product.option_id) || '', ...(linkedOptionsByProduct.get(product.id) || [])].filter(Boolean)),
        variantRows,
        fallbackImages: (fallbackMediaByProduct.get(product.id) || []).filter((row) => row.media_type === 'image').map((row) => row.media_path),
        fallbackVideos: (fallbackMediaByProduct.get(product.id) || []).filter((row) => row.media_type === 'video').map((row) => row.media_path),
      }
    })
    .filter((product) => String(product.sku || '').trim().length >= 4 && product.name && detectTab(product))
}

function headerMap(worksheet, rowNumber) {
  const map = new Map()
  const values = worksheet.getRow(rowNumber).values
  for (let i = 1; i < values.length; i += 1) {
    const text = String(values[i] || '').trim()
    if (!text) continue
    if (!map.has(text)) map.set(text, [])
    map.get(text).push(i)
  }
  return map
}

function addReadmeSheet(workbook) {
  const sheet = workbook.addWorksheet('Read Me')
  sheet.getColumn(1).width = 120
  const lines = [
    'Product Creation Sheet',
    '',
    'This workbook keeps the client-style tab structure but only includes the columns used in the current Google Sheet sync.',
    'Use only real catalog master values already available in House of Diams admin.',
    '',
    'Main rules:',
    '1. SKU, Title, Description, Category, and Image must be filled.',
    '2. Metal uses the new combined metal master labels, for example 14K White Gold.',
    '3. Use "|" between combined metal options.',
    '4. Use "|" between variant price groups in the same order as Metal.',
    '5. Use commas inside one image/video set and "|" between sets.',
    '6. Category, Sub-Cat., Option, Material, Style, and By Shape should match real admin values.',
    '',
    'The product tabs already contain 10 real-data examples across rings, earrings, pendants, and bracelets.',
  ]
  lines.forEach((line) => sheet.addRow([line]))
  sheet.getRow(1).font = { bold: true, size: 14 }
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
    const targetCol = target.getColumn(index + 1)
    const sourceIndexes = sourceHeaderMap.get(column.sourceHeader) || [1]
    const sourceIndex = sourceIndexes[0]
    const sourceCol = source.getColumn(sourceIndex)
    targetCol.width = sourceCol.width || 18
    targetCol.style = clone(sourceCol.style || {})
  })

  for (let rowNumber = 1; rowNumber <= 5; rowNumber += 1) {
    const targetRow = target.getRow(rowNumber)
    const sourceRow = source.getRow(rowNumber)
    targetRow.height = sourceRow.height

    PRODUCT_COLUMNS.forEach((column, index) => {
      const sourceIndexes = sourceHeaderMap.get(column.sourceHeader) || [1]
      const sourceIndex = sourceIndexes[0]
      const sourceCell = sourceRow.getCell(sourceIndex)
      const targetCell = targetRow.getCell(index + 1)
      copyCell(sourceCell, targetCell)

      if (rowNumber === 4 && ['Metal', 'Variant Prices', 'Variant Images', 'Variant Videos'].includes(column.key)) {
        targetCell.value = 'Variants'
      }
      if (rowNumber === 5) {
        targetCell.value = column.key
      }
    })

    targetRow.commit()
  }

  return target
}

function buildRow(product, rowIndex, r2BaseUrl) {
  const variantLabels = product.variantRows.map((row) => row.label)
  const variantPrices = product.variantRows.map((row) => row.price)
  const variantImages = product.variantRows.map((row) => row.images.map((entry) => toPublicUrl(entry, r2BaseUrl)).filter(Boolean).join(','))
  const variantVideos = product.variantRows.map((row) => row.videos.map((entry) => toPublicUrl(entry, r2BaseUrl)).filter(Boolean).join(','))

  const fallbackImages = [
    ...product.variantRows.flatMap((row) => row.images),
    ...product.fallbackImages,
    product.image_1_path,
    product.image_2_path,
    product.image_3_path,
    product.image_4_path,
  ].map((entry) => toPublicUrl(entry, r2BaseUrl)).filter(Boolean)

  const primaryImages = unique(fallbackImages).slice(0, 4)
  const resolvedVariantImages = variantImages.length > 0 && variantImages.some(Boolean) ? variantImages : [primaryImages.join(',')]
  const resolvedVariantVideos = variantVideos.length > 0 && variantVideos.some(Boolean) ? variantVideos : [DUMMY_VIDEO_URL]
  const resolvedVariantLabels = variantLabels.length > 0 ? variantLabels : [DUMMY_METAL]
  const resolvedVariantPrices = variantPrices.length > 0 ? variantPrices : [stringifyPrice(product.base_price) || stringifyPrice(product.discount_price) || '1000']
  const resolvedStyle = product.styleName || DUMMY_STYLE
  const resolvedShape = product.shapeNames.length > 0 ? product.shapeNames.join(', ') : DUMMY_SHAPE
  const resolvedMaterial = product.materialNames.length > 0 ? product.materialNames.join(', ') : DUMMY_MATERIAL
  const resolvedNspPrice = stringifyPrice(product.discount_price) || stringifyPrice(product.base_price)

  return {
    'No': rowIndex + 1,
    'Upload Date': DUMMY_UPLOAD_DATE,
    'SKU': product.sku,
    'Image': primaryImages.join(','),
    'Category': product.categoryName,
    'Sub-Cat.': product.subcategoryNames.join(', '),
    'Option': product.optionNames.join(', '),
    'By Shape': resolvedShape,
    'Gender': product.wedding_gender || DUMMY_GENDER,
    'Material': resolvedMaterial,
    'Style': resolvedStyle,
    'Style No.': `${product.sku}-STYLE`,
    'Title': product.name,
    'Description': product.description || `${product.name} sample product description for Google Sheet product creation.`,
    'Metal': resolvedVariantLabels.join('|'),
    'Variant Prices': resolvedVariantPrices.join('|'),
    'Variant Images': resolvedVariantImages.join('|'),
    'Variant Videos': resolvedVariantVideos.join('|'),
    'NSP Price': resolvedNspPrice,
  }
}

function fillProductSheet(worksheet, products, r2BaseUrl) {
  products.forEach((product, index) => {
    const rowNumber = 6 + index
    const row = worksheet.getRow(rowNumber)
    const templateRow = worksheet.getRow(6)
    row.height = templateRow.height
    PRODUCT_COLUMNS.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1)
      cell.style = clone(templateRow.getCell(columnIndex + 1).style || {})
      cell.value = buildRow(product, index, r2BaseUrl)[column.key] || ''
    })
    row.commit()
  })
}

async function main() {
  const { client: supabase, r2BaseUrl } = createSupabase()
  const data = await fetchAllData(supabase)
  const products = normalizeProducts(data)

  const byTab = new Map(PRODUCT_TABS.map((tab) => [tab, []]))
  products.forEach((product) => {
    const tab = detectTab(product)
    if (tab) byTab.get(tab).push(product)
  })

  const sourceWorkbook = new ExcelJS.Workbook()
  await sourceWorkbook.xlsx.readFile(SOURCE_WORKBOOK)
  const targetWorkbook = new ExcelJS.Workbook()
  targetWorkbook.creator = 'OpenAI Codex'
  targetWorkbook.created = new Date()

  addReadmeSheet(targetWorkbook)
  PRODUCT_TABS.forEach((sheetName) => {
    createProductSheet(sourceWorkbook, targetWorkbook, sheetName)
  })

  const perTabCount = {
    Ring_Final: 4,
    Earring_Final: 4,
    Pendant_Final: 1,
    BrcBg: 1,
  }

  PRODUCT_TABS.forEach((tab) => {
    const chosen = pickVariedProducts(byTab.get(tab) || [], perTabCount[tab])
    fillProductSheet(targetWorkbook.getWorksheet(tab), chosen, r2BaseUrl)
  })

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  await targetWorkbook.xlsx.writeFile(OUTPUT_FILE)
  console.log(OUTPUT_FILE)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
