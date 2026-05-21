const fs = require('fs')
const path = require('path')
const ExcelJS = require('exceljs')
const { createClient } = require('@supabase/supabase-js')

const ROOT_DIR = path.join(__dirname, '..', '..')
const ADMIN_DIR = path.join(ROOT_DIR, 'admin')
const INPUT_WORKBOOK = 'C:/Users/user/Downloads/DCB-Akshar (1).xlsx'
const OUTPUT_DIR = path.join(ROOT_DIR, 'client-sheet-modernized')
const OUTPUT_WORKBOOK = path.join(OUTPUT_DIR, 'DCB-Akshar-Modernized-Real-DB.xlsx')

const PRODUCT_TABS = ['Ring_Final', 'Earring_Final', 'Pendant_Final', 'BrcBg']
const HEADER_ROW = 5
const DATA_START_ROW = 6

function readEnvFile(filePath) {
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

function buildSupabaseClient() {
  const env = readEnvFile(path.join(ADMIN_DIR, '.env.local'))
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables in admin/.env.local')
  }

  return {
    client: createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }),
    r2PublicBaseUrl: String(env.CLOUDFLARE_R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, ''),
  }
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function buildCombinedMetalDisplayLabel(metal) {
  const name = String(metal.name || '').trim()
  const purity = String(metal.purity_label || '').trim()
  const baseMetalName = String(metal.base_metal_name || name).trim()
  const displayLabel = String(metal.display_label || '').trim()

  if (displayLabel && (!purity || (displayLabel !== name && displayLabel !== baseMetalName))) {
    return displayLabel
  }

  return purity ? `${purity} ${baseMetalName}`.trim() : baseMetalName
}

function toPublicUrl(value, r2PublicBaseUrl) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  return r2PublicBaseUrl ? `${r2PublicBaseUrl}/${text.replace(/^\/+/, '')}` : text
}

function stringifyPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return ''
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function buildGroupedVariantMediaGroups(mediaItems, r2PublicBaseUrl) {
  const imageGroups = []
  const videoGroups = []

  for (const item of mediaItems) {
    const images = item.images.map((entry) => toPublicUrl(entry, r2PublicBaseUrl)).filter(Boolean)
    const videos = item.videos.map((entry) => toPublicUrl(entry, r2PublicBaseUrl)).filter(Boolean)
    imageGroups.push(images.join(','))
    videoGroups.push(videos.join(','))
  }

  return {
    groupedImages: imageGroups.join('~~'),
    groupedVideos: videoGroups.join('~~'),
  }
}

function pickDefaultVariant(product) {
  return product.variantRows.find((entry) => entry.is_default) || product.variantRows[0] || null
}

function flattenDefaultImages(product, r2PublicBaseUrl) {
  const defaultVariant = pickDefaultVariant(product)
  const defaultVariantImages = defaultVariant?.images.map((entry) => toPublicUrl(entry, r2PublicBaseUrl)).filter(Boolean) || []
  if (defaultVariantImages.length > 0) return defaultVariantImages

  const defaultFallbackImages = product.defaultFallbackImages.map((entry) => toPublicUrl(entry, r2PublicBaseUrl)).filter(Boolean)
  if (defaultFallbackImages.length > 0) return defaultFallbackImages

  return [
    toPublicUrl(product.image_1_path, r2PublicBaseUrl),
    toPublicUrl(product.image_2_path, r2PublicBaseUrl),
    toPublicUrl(product.image_3_path, r2PublicBaseUrl),
    toPublicUrl(product.image_4_path, r2PublicBaseUrl),
  ].filter(Boolean)
}

function pickDefaultVideo(product, r2PublicBaseUrl) {
  const defaultVariant = pickDefaultVariant(product)
  const defaultVariantVideo = defaultVariant?.videos[0] || ''
  if (defaultVariantVideo) return toPublicUrl(defaultVariantVideo, r2PublicBaseUrl)

  const fallbackVideo = product.defaultFallbackVideos[0] || ''
  if (fallbackVideo) return toPublicUrl(fallbackVideo, r2PublicBaseUrl)

  return toPublicUrl(product.video_path, r2PublicBaseUrl)
}

function scoreProduct(product) {
  return (
    product.variantRows.length * 10 +
    product.variantRows.reduce((total, item) => total + item.images.length * 2 + item.videos.length * 3, 0) +
    product.materialNames.length * 2 +
    product.shapeNames.length * 2 +
    product.optionNames.length * 2 +
    product.subcategoryNames.length * 2 +
    (product.description ? 1 : 0)
  )
}

function chooseTab(product) {
  const category = product.categoryName
  const subcategory = product.subcategoryName

  if (category === 'Engagement Rings') return 'Ring_Final'
  if (subcategory === 'Earrings') return 'Earring_Final'
  if (subcategory === 'Necklaces') return 'Pendant_Final'
  if (subcategory === 'Bracelet') return 'BrcBg'
  return null
}

function selectVariedProducts(products, desiredCount) {
  const sorted = [...products].sort((a, b) => scoreProduct(b) - scoreProduct(a))
  const selected = []
  const seenPrimaryOptions = new Set()
  const seenPrimarySubcategories = new Set()
  const seenShapeSets = new Set()

  for (const product of sorted) {
    const optionKey = product.optionName || '__blank__'
    if (!seenPrimaryOptions.has(optionKey)) {
      selected.push(product)
      seenPrimaryOptions.add(optionKey)
      seenPrimarySubcategories.add(product.subcategoryName || '__blank__')
      seenShapeSets.add(product.shapeNames.join('|'))
      if (selected.length >= desiredCount) return selected
    }
  }

  for (const product of sorted) {
    if (selected.includes(product)) continue
    const subcategoryKey = product.subcategoryName || '__blank__'
    const shapeKey = product.shapeNames.join('|') || '__blank__'
    if (!seenPrimarySubcategories.has(subcategoryKey) || !seenShapeSets.has(shapeKey)) {
      selected.push(product)
      seenPrimarySubcategories.add(subcategoryKey)
      seenShapeSets.add(shapeKey)
      if (selected.length >= desiredCount) return selected
    }
  }

  for (const product of sorted) {
    if (selected.includes(product)) continue
    selected.push(product)
    if (selected.length >= desiredCount) return selected
  }

  return selected
}

async function fetchLookupRows(supabase) {
  const [
    categoriesResult,
    subcategoriesResult,
    optionsResult,
    stylesResult,
    materialsResult,
    shapesResult,
    certificatesResult,
    metalsResult,
  ] = await Promise.all([
    supabase.from('catalog_categories').select('id, name, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_subcategories').select('id, name, category_id, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_options').select('id, name, subcategory_id, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_styles').select('id, name, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_material_values').select('id, name, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_stone_shapes').select('id, name, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_certificates').select('id, name, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
    supabase.from('catalog_metals').select('id, name, slug, purity_label, base_metal_name, display_label, status, display_order').eq('status', 'active').order('display_order', { ascending: true }),
  ])

  for (const result of [
    categoriesResult,
    subcategoriesResult,
    optionsResult,
    stylesResult,
    materialsResult,
    shapesResult,
    certificatesResult,
    metalsResult,
  ]) {
    if (result.error) throw new Error(result.error.message)
  }

  return {
    categories: categoriesResult.data || [],
    subcategories: subcategoriesResult.data || [],
    options: optionsResult.data || [],
    styles: stylesResult.data || [],
    materials: materialsResult.data || [],
    shapes: shapesResult.data || [],
    certificates: certificatesResult.data || [],
    metals: metalsResult.data || [],
  }
}

async function fetchProductsWithRelations(supabase) {
  const [
    productsResult,
    metalVariantsResult,
    variantMediaResult,
    materialSelectionsResult,
    shapeSelectionsResult,
    subcategoryLinksResult,
    optionLinksResult,
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, slug, sku, main_category_id, subcategory_id, option_id, wedding_gender, description, base_price, discount_price, image_1_path, image_2_path, image_3_path, image_4_path, video_path, certificate_ids, style_id, product_lane, stock_quantity, status'
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('product_metal_variants')
      .select('id, product_id, metal_id, price, is_default, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_variant_media_items')
      .select('id, product_id, variant_id, media_type, media_path, sort_order, is_default_fallback')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_material_value_selections')
      .select('product_id, material_value_id, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_stone_shapes')
      .select('product_id, shape_id')
      .order('shape_id', { ascending: true }),
    supabase
      .from('product_subcategory_links')
      .select('product_id, subcategory_id, is_primary, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_option_links')
      .select('product_id, option_id, is_primary, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  for (const result of [
    productsResult,
    metalVariantsResult,
    variantMediaResult,
    materialSelectionsResult,
    shapeSelectionsResult,
    subcategoryLinksResult,
    optionLinksResult,
  ]) {
    if (result.error) throw new Error(result.error.message)
  }

  return {
    products: productsResult.data || [],
    metalVariants: metalVariantsResult.data || [],
    variantMediaItems: variantMediaResult.data || [],
    materialSelections: materialSelectionsResult.data || [],
    shapeSelections: shapeSelectionsResult.data || [],
    subcategoryLinks: subcategoryLinksResult.data || [],
    optionLinks: optionLinksResult.data || [],
  }
}

function buildNormalizedProducts(data, lookups) {
  const categoryById = new Map(lookups.categories.map((entry) => [entry.id, entry.name]))
  const subcategoryById = new Map(lookups.subcategories.map((entry) => [entry.id, entry.name]))
  const optionById = new Map(lookups.options.map((entry) => [entry.id, entry.name]))
  const styleById = new Map(lookups.styles.map((entry) => [entry.id, entry.name]))
  const materialById = new Map(lookups.materials.map((entry) => [entry.id, entry.name]))
  const shapeById = new Map(lookups.shapes.map((entry) => [entry.id, entry.name]))
  const certificateById = new Map(lookups.certificates.map((entry) => [entry.id, entry.name]))
  const metalById = new Map(lookups.metals.map((entry) => [entry.id, entry]))

  const materialSelectionsByProduct = new Map()
  for (const row of data.materialSelections) {
    materialSelectionsByProduct.set(row.product_id, [...(materialSelectionsByProduct.get(row.product_id) || []), row.material_value_id])
  }

  const shapesByProduct = new Map()
  for (const row of data.shapeSelections) {
    shapesByProduct.set(row.product_id, [...(shapesByProduct.get(row.product_id) || []), row.shape_id])
  }

  const linkedSubcategoriesByProduct = new Map()
  for (const row of data.subcategoryLinks) {
    linkedSubcategoriesByProduct.set(row.product_id, [...(linkedSubcategoriesByProduct.get(row.product_id) || []), row.subcategory_id])
  }

  const linkedOptionsByProduct = new Map()
  for (const row of data.optionLinks) {
    linkedOptionsByProduct.set(row.product_id, [...(linkedOptionsByProduct.get(row.product_id) || []), row.option_id])
  }

  const mediaByVariantId = new Map()
  const defaultMediaByProduct = new Map()
  for (const row of data.variantMediaItems) {
    if (row.variant_id) {
      mediaByVariantId.set(row.variant_id, [...(mediaByVariantId.get(row.variant_id) || []), row])
    } else if (row.is_default_fallback) {
      defaultMediaByProduct.set(row.product_id, [...(defaultMediaByProduct.get(row.product_id) || []), row])
    }
  }

  const variantsByProduct = new Map()
  for (const row of data.metalVariants) {
    variantsByProduct.set(row.product_id, [...(variantsByProduct.get(row.product_id) || []), row])
  }

  return data.products
    .map((product) => {
      const primaryCategoryName = categoryById.get(product.main_category_id) || ''
      const primarySubcategoryName = subcategoryById.get(product.subcategory_id) || ''
      const primaryOptionName = optionById.get(product.option_id) || ''
      const styleName = styleById.get(product.style_id) || ''
      const certificateNames = unique((product.certificate_ids || []).map((id) => certificateById.get(id) || '').filter(Boolean))
      const materialNames = unique((materialSelectionsByProduct.get(product.id) || []).map((id) => materialById.get(id) || '').filter(Boolean))
      const shapeNames = unique((shapesByProduct.get(product.id) || []).map((id) => shapeById.get(id) || '').filter(Boolean))

      const subcategoryNames = unique([
        primarySubcategoryName,
        ...(linkedSubcategoriesByProduct.get(product.id) || []).map((id) => subcategoryById.get(id) || ''),
      ].filter(Boolean))

      const optionNames = unique([
        primaryOptionName,
        ...(linkedOptionsByProduct.get(product.id) || []).map((id) => optionById.get(id) || ''),
      ].filter(Boolean))

      const defaultFallbackMedia = defaultMediaByProduct.get(product.id) || []
      const defaultFallbackImages = defaultFallbackMedia.filter((entry) => entry.media_type === 'image').map((entry) => entry.media_path)
      const defaultFallbackVideos = defaultFallbackMedia.filter((entry) => entry.media_type === 'video').map((entry) => entry.media_path)

      const variantRows = (variantsByProduct.get(product.id) || [])
        .map((variant) => {
          const metal = metalById.get(variant.metal_id)
          if (!metal) return null

          const variantMedia = mediaByVariantId.get(variant.id) || []
          return {
            id: variant.id,
            metal_id: variant.metal_id,
            label: buildCombinedMetalDisplayLabel(metal),
            price: stringifyPrice(variant.price),
            is_default: Boolean(variant.is_default),
            sort_order: Number(variant.sort_order || 0),
            images: variantMedia.filter((entry) => entry.media_type === 'image').map((entry) => entry.media_path),
            videos: variantMedia.filter((entry) => entry.media_type === 'video').map((entry) => entry.media_path),
          }
        })
        .filter(Boolean)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

      return {
        ...product,
        categoryName: primaryCategoryName,
        subcategoryName: primarySubcategoryName,
        optionName: primaryOptionName,
        styleName,
        certificateNames,
        materialNames,
        shapeNames,
        subcategoryNames,
        optionNames,
        variantRows,
        defaultFallbackImages,
        defaultFallbackVideos,
      }
    })
    .filter((product) => product.sku && product.name && product.categoryName)
}

function getHeaderIndexMap(worksheet) {
  const map = new Map()
  const values = worksheet.getRow(HEADER_ROW).values
  for (let index = 1; index < values.length; index += 1) {
    const header = String(values[index] || '').trim()
    if (!header) continue
    if (!map.has(header)) map.set(header, [])
    map.get(header).push(index)
  }
  return map
}

function renameInitialHeaders(worksheet) {
  let headerMap = getHeaderIndexMap(worksheet)

  const subCatIndex = (headerMap.get('Sub-Cat.') || [])[0]
  if (subCatIndex && String(worksheet.getRow(HEADER_ROW).getCell(subCatIndex + 1).value || '').trim() !== 'Option') {
    worksheet.spliceColumns(subCatIndex + 1, 0, [])
    worksheet.getCell(HEADER_ROW, subCatIndex + 1).value = 'Option'
  }

  headerMap = getHeaderIndexMap(worksheet)

  const styleIndex = (headerMap.get('Design Theme') || [])[0]
  if (styleIndex) worksheet.getCell(HEADER_ROW, styleIndex).value = 'Style'

  headerMap = getHeaderIndexMap(worksheet)

  const firstColIndex = (headerMap.get('Col') || []).find((index) => index < 30)
  if (firstColIndex) worksheet.getCell(HEADER_ROW, firstColIndex).value = 'Metal'

  const ktCodeIndex = (headerMap.get('KT Code') || [])[0]
  if (ktCodeIndex) worksheet.getCell(HEADER_ROW, ktCodeIndex).value = 'Variant Prices'

  const ktColIndex = (headerMap.get('KT/Col') || [])[0]
  if (ktColIndex) {
    worksheet.getCell(HEADER_ROW, ktColIndex).value = 'Variant Images'
    worksheet.spliceColumns(ktColIndex + 1, 0, [])
    worksheet.getCell(HEADER_ROW, ktColIndex + 1).value = 'Variant Videos'
  }

  // Make the row-4 band read clearly for the modernized variant section.
  headerMap = getHeaderIndexMap(worksheet)
  const metalIndex = (headerMap.get('Metal') || [])[0]
  const variantPricesIndex = (headerMap.get('Variant Prices') || [])[0]
  const variantImagesIndex = (headerMap.get('Variant Images') || [])[0]
  const variantVideosIndex = (headerMap.get('Variant Videos') || [])[0]

  for (const index of [metalIndex, variantPricesIndex, variantImagesIndex, variantVideosIndex].filter(Boolean)) {
    worksheet.getCell(4, index).value = 'Variants'
  }
}

function setSheetColumnsForRow(worksheet, rowNumber, rowData) {
  const headerMap = getHeaderIndexMap(worksheet)
  const row = worksheet.getRow(rowNumber)

  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    row.getCell(column).value = ''
  }

  const getIndex = (header, preferred = null) => {
    const values = headerMap.get(header) || []
    if (preferred === 'first') return values[0]
    if (preferred === 'last') return values[values.length - 1]
    return values[0]
  }

  const assignments = [
    ['No', rowData.no],
    ['Upload Date', rowData.uploadDate],
    ['SKU', rowData.sku],
    ['Image', rowData.image],
    ['Category', rowData.category],
    ['Sub-Cat.', rowData.subcategory],
    ['Option', rowData.option],
    ['By Shape', rowData.shape],
    ['Gender', rowData.gender],
    ['Material', rowData.material],
    ['Style', rowData.style],
    ['Style No.', rowData.styleNo],
    ['Title', rowData.title],
    ['Description', rowData.description],
    ['Metal', rowData.metal],
    ['Variant Prices', rowData.variantPrices],
    ['Variant Images', rowData.variantImages],
    ['Variant Videos', rowData.variantVideos],
    ['Display Price', rowData.displayPrice],
    ['NSP Price', rowData.nspPrice],
  ]

  for (const [header, value] of assignments) {
    const index = getIndex(header)
    if (index) row.getCell(index).value = value
  }

  row.commit()
}

function cloneValue(value) {
  if (value == null) return value
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function cloneStyle(style) {
  return typeof structuredClone === 'function' ? structuredClone(style || {}) : JSON.parse(JSON.stringify(style || {}))
}

function copyCell(sourceCell, targetCell) {
  targetCell.value = cloneValue(sourceCell.value)
  targetCell.style = cloneStyle(sourceCell.style)
  if (sourceCell.numFmt) targetCell.numFmt = sourceCell.numFmt
  if (sourceCell.note) targetCell.note = cloneValue(sourceCell.note)
}

function parseMergeRowBounds(range) {
  const refs = String(range).split(':')
  const getRow = (ref) => {
    const match = String(ref).match(/(\d+)/)
    return match ? Number(match[1]) : 0
  }
  return {
    fromRow: getRow(refs[0]),
    toRow: getRow(refs[1] || refs[0]),
  }
}

function copyWorksheetPortion(sourceWorksheet, targetWorksheet, options = {}) {
  const maxRow = options.maxRow ?? sourceWorksheet.rowCount

  for (let column = 1; column <= sourceWorksheet.columnCount; column += 1) {
    const sourceColumn = sourceWorksheet.getColumn(column)
    const targetColumn = targetWorksheet.getColumn(column)
    targetColumn.width = sourceColumn.width
    targetColumn.hidden = sourceColumn.hidden
    targetColumn.outlineLevel = sourceColumn.outlineLevel
    targetColumn.style = cloneStyle(sourceColumn.style)
  }

  for (let rowNumber = 1; rowNumber <= maxRow; rowNumber += 1) {
    const sourceRow = sourceWorksheet.getRow(rowNumber)
    const targetRow = targetWorksheet.getRow(rowNumber)
    targetRow.height = sourceRow.height
    targetRow.hidden = sourceRow.hidden
    for (let column = 1; column <= sourceWorksheet.columnCount; column += 1) {
      copyCell(sourceRow.getCell(column), targetRow.getCell(column))
    }
    targetRow.commit()
  }

  for (const mergeRange of sourceWorksheet.model.merges || []) {
    const { toRow } = parseMergeRowBounds(mergeRange)
    if (toRow <= maxRow) {
      targetWorksheet.mergeCells(mergeRange)
    }
  }
}

function applyTemplateRowStyle(worksheet, rowNumber, templateRowNumber) {
  const templateRow = worksheet.getRow(templateRowNumber)
  const targetRow = worksheet.getRow(rowNumber)
  targetRow.height = templateRow.height
  targetRow.hidden = templateRow.hidden
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const templateCell = templateRow.getCell(column)
    const targetCell = targetRow.getCell(column)
    targetCell.style = cloneStyle(templateCell.style)
    if (templateCell.numFmt) targetCell.numFmt = templateCell.numFmt
    targetCell.value = ''
  }
  targetRow.commit()
}

function buildSheetRow(product, index, r2PublicBaseUrl) {
  const { groupedImages, groupedVideos } = buildGroupedVariantMediaGroups(product.variantRows, r2PublicBaseUrl)
  const defaultVariant = pickDefaultVariant(product)
  const defaultImages = flattenDefaultImages(product, r2PublicBaseUrl)

  return {
    no: index + 1,
    uploadDate: '',
    sku: product.sku,
    image: defaultImages.join(','),
    category: product.categoryName,
    subcategory: product.subcategoryNames.join(', '),
    option: product.optionNames.join(', '),
    shape: product.shapeNames.join(', '),
    gender: product.wedding_gender || '',
    material: product.materialNames.join(', '),
    style: product.styleName,
    styleNo: '',
    title: product.name,
    description: product.description || '',
    metal: product.variantRows.map((entry) => entry.label).join('~~'),
    variantPrices: product.variantRows.map((entry) => entry.price).join('~~'),
    variantImages: groupedImages,
    variantVideos: groupedVideos,
    displayPrice: defaultVariant?.price || stringifyPrice(product.base_price),
    nspPrice: stringifyPrice(product.discount_price),
  }
}

function tabTargetCounts(tabName) {
  switch (tabName) {
    case 'Ring_Final':
      return 12
    case 'Earring_Final':
      return 12
    case 'Pendant_Final':
      return 10
    case 'BrcBg':
      return 8
    default:
      return 8
  }
}

async function generateWorkbook() {
  const { client: supabase, r2PublicBaseUrl } = buildSupabaseClient()
  console.log('Loading lookup rows...')
  const lookups = await fetchLookupRows(supabase)
  console.log('Loading products and relations...')
  const data = await fetchProductsWithRelations(supabase)
  console.log('Normalizing products...')
  const normalizedProducts = buildNormalizedProducts(data, lookups)

  const sourceWorkbook = new ExcelJS.Workbook()
  console.log('Reading source workbook...')
  await sourceWorkbook.xlsx.readFile(INPUT_WORKBOOK)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'OpenAI Codex'
  workbook.created = new Date()

  const productsByTab = new Map(PRODUCT_TABS.map((tab) => [tab, []]))
  for (const product of normalizedProducts) {
    const tab = chooseTab(product)
    if (!tab) continue
    productsByTab.get(tab).push(product)
  }

  for (const worksheetName of sourceWorkbook.worksheets.map((worksheet) => worksheet.name)) {
    const sourceWorksheet = sourceWorkbook.getWorksheet(worksheetName)
    const targetWorksheet = workbook.addWorksheet(worksheetName, {
      views: cloneValue(sourceWorksheet.views),
      pageSetup: cloneValue(sourceWorksheet.pageSetup),
      properties: cloneValue(sourceWorksheet.properties),
    })

    if (PRODUCT_TABS.includes(worksheetName)) {
      copyWorksheetPortion(sourceWorksheet, targetWorksheet, { maxRow: DATA_START_ROW })
    } else {
      copyWorksheetPortion(sourceWorksheet, targetWorksheet)
    }
  }

  for (const tabName of PRODUCT_TABS) {
    console.log(`Preparing ${tabName}...`)
    const worksheet = workbook.getWorksheet(tabName)
    if (!worksheet) continue

    renameInitialHeaders(worksheet)

    const selectedProducts = selectVariedProducts(productsByTab.get(tabName) || [], tabTargetCounts(tabName))
    const rows = selectedProducts.map((product, index) => buildSheetRow(product, index, r2PublicBaseUrl))
    console.log(`${tabName}: writing ${rows.length} rows`)

    rows.forEach((rowData, index) => {
      const rowNumber = DATA_START_ROW + index
      if (rowNumber > DATA_START_ROW) {
        applyTemplateRowStyle(worksheet, rowNumber, DATA_START_ROW)
      }
      setSheetColumnsForRow(worksheet, rowNumber, rowData)
    })
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log('Writing output workbook...')
  await workbook.xlsx.writeFile(OUTPUT_WORKBOOK)

  return {
    outputPath: OUTPUT_WORKBOOK,
    counts: Object.fromEntries(PRODUCT_TABS.map((tab) => [tab, (productsByTab.get(tab) || []).length])),
  }
}

generateWorkbook()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2))
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
