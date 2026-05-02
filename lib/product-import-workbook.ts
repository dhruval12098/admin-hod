import 'server-only'

import ExcelJS from 'exceljs'
import { PRODUCT_IMPORT_COLUMNS } from '@/lib/product-import-templates'

type QueryBuilder = {
  eq: (column: string, value: string) => QueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: any[] | null; error: { message: string } | null }>
}

type AdminClient = {
  from: (table: string) => {
    select: (columns: string) => QueryBuilder
  }
}

type LookupRow = {
  id: string
  name: string
}

type SubcategoryLookupRow = LookupRow & {
  category_id: string
}

type OptionLookupRow = LookupRow & {
  subcategory_id: string
}

type LookupMap = {
  lanes: string[]
  categories: LookupRow[]
  subcategories: SubcategoryLookupRow[]
  options: OptionLookupRow[]
  styles: string[]
  gst: string[]
  metals: string[]
  certificates: string[]
  materialValues: string[]
}

const WORKSHEET_NAME = 'Product Upload'
const INSTRUCTIONS_SHEET = 'Instructions'
const LOOKUPS_SHEET = 'Lookups'
const MAX_TEMPLATE_ROWS = 200

function sanitizeRangeName(value: string) {
  const cleaned = value
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const safe = cleaned.length > 0 ? cleaned : 'blank'
  return /^[A-Za-z_]/.test(safe) ? safe : `n_${safe}`
}

function excelNameExpression(cellRef: string) {
  return `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(TRIM(${cellRef}),"&"," and "),"/"," "),"-"," "),"."," "),"("," "),")"," "),"'"," ")," ","_")`
}

async function loadLookupMap(adminClient: AdminClient): Promise<LookupMap> {
  const [categories, subcategories, options, styles, gst, metals, certificates, materialValues] = await Promise.all([
    adminClient.from('catalog_categories').select('id, name').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('catalog_subcategories').select('id, name, category_id').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('catalog_options').select('id, name, subcategory_id').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('catalog_styles').select('name').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('catalog_gst_slabs').select('name').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('catalog_metals').select('name').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('catalog_certificates').select('name').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('catalog_material_values').select('name').eq('status', 'active').order('display_order', { ascending: true }),
  ])

  const extractNames = (result: { data: Array<{ name?: string | null }> | null; error: { message: string } | null }, label: string) => {
    if (result.error) throw new Error(result.error.message || `Unable to load ${label}.`)
    return (result.data ?? []).map((row) => (row.name ?? '').trim()).filter(Boolean)
  }

  const extractRows = <T extends { id?: string | null; name?: string | null }>(
    result: { data: T[] | null; error: { message: string } | null },
    label: string
  ) => {
    if (result.error) throw new Error(result.error.message || `Unable to load ${label}.`)
    return (result.data ?? [])
      .map((row) => ({
        ...row,
        id: String(row.id ?? '').trim(),
        name: String(row.name ?? '').trim(),
      }))
      .filter((row) => row.id && row.name)
  }

  return {
    lanes: ['standard', 'hiphop', 'collection'],
    categories: extractRows(categories, 'categories') as LookupRow[],
    subcategories: extractRows(subcategories, 'subcategories') as SubcategoryLookupRow[],
    options: extractRows(options, 'options') as OptionLookupRow[],
    styles: extractNames(styles, 'styles'),
    gst: extractNames(gst, 'GST slabs'),
    metals: extractNames(metals, 'metals'),
    certificates: extractNames(certificates, 'certificates'),
    materialValues: extractNames(materialValues, 'material values'),
  }
}

function columnLetter(index: number) {
  let result = ''
  let current = index
  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }
  return result
}

function addInstructionsSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet(INSTRUCTIONS_SHEET, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const lines = [
    ['Bulk Product Import Workbook'],
    ['1. Fill one row per product in the "Product Upload" sheet.'],
    ['2. Category dropdown comes first. Subcategory dropdown changes based on the selected category.'],
    ['3. Option dropdown changes based on the selected category and subcategory combination.'],
    ['4. Use the dropdown cells where provided. They come from your live master tables.'],
    ['5. For metals, certificates, and material values, use the repeated columns instead of typing separators.'],
    ['6. Leave optional cells blank if a product does not need them.'],
    ['7. Shipping and care & warranty are applied automatically from the current active master rules.'],
    ['8. Featured and Ready To Ship are defaulted by the importer, so the client does not need to fill them.'],
    ['9. Image columns should contain file names only, such as SKU_main.jpg.'],
    ['10. Video can be a public URL or a ZIP filename. Use a full URL when the video already lives in Cloudflare R2 or another CDN.'],
    ['11. Upload this workbook directly in Bulk Imports together with the image ZIP.'],
  ]

  lines.forEach((row) => sheet.addRow(row))
  sheet.getColumn(1).width = 120
  sheet.getRow(1).font = { bold: true, size: 14 }
}

function defineNamedRange(workbook: ExcelJS.Workbook, name: string, sheetName: string, fromColumn: number, fromRow: number, toRow: number) {
  if (toRow < fromRow) return
  const column = columnLetter(fromColumn)
  workbook.definedNames.add(`'${sheetName}'!$${column}$${fromRow}:$${column}$${toRow}`, name)
}

function addLookupsSheet(workbook: ExcelJS.Workbook, lookups: LookupMap) {
  const sheet = workbook.addWorksheet(LOOKUPS_SHEET)

  const lookupColumns = [
    { label: 'Lanes', values: lookups.lanes },
    { label: 'Categories', values: lookups.categories.map((row) => row.name) },
    { label: 'Styles', values: lookups.styles },
    { label: 'GST Slabs', values: lookups.gst },
    { label: 'Metals', values: lookups.metals },
    { label: 'Certificates', values: lookups.certificates },
    { label: 'Material Values', values: lookups.materialValues },
  ]

  lookupColumns.forEach((column, index) => {
    const colIndex = index + 1
    sheet.getCell(1, colIndex).value = column.label
    sheet.getCell(1, colIndex).font = { bold: true }
    sheet.getColumn(colIndex).width = 28
    column.values.forEach((value, valueIndex) => {
      sheet.getCell(valueIndex + 2, colIndex).value = value
    })
  })

  defineNamedRange(workbook, 'lanes', LOOKUPS_SHEET, 1, 2, lookups.lanes.length + 1)
  defineNamedRange(workbook, 'categories', LOOKUPS_SHEET, 2, 2, lookups.categories.length + 1)
  defineNamedRange(workbook, 'styles', LOOKUPS_SHEET, 3, 2, lookups.styles.length + 1)
  defineNamedRange(workbook, 'gst_slabs', LOOKUPS_SHEET, 4, 2, lookups.gst.length + 1)
  defineNamedRange(workbook, 'metals', LOOKUPS_SHEET, 5, 2, lookups.metals.length + 1)
  defineNamedRange(workbook, 'certificates', LOOKUPS_SHEET, 6, 2, lookups.certificates.length + 1)
  defineNamedRange(workbook, 'material_values', LOOKUPS_SHEET, 7, 2, lookups.materialValues.length + 1)

  let dynamicColumnIndex = 10

  const categoryNameById = new Map(lookups.categories.map((row) => [row.id, row.name]))
  const subcategoriesByCategory = new Map<string, string[]>()
  for (const row of lookups.subcategories) {
    const categoryName = categoryNameById.get(row.category_id)
    if (!categoryName) continue
    subcategoriesByCategory.set(categoryName, [...(subcategoriesByCategory.get(categoryName) ?? []), row.name])
  }

  for (const category of lookups.categories) {
    const values = subcategoriesByCategory.get(category.name) ?? []
    if (values.length === 0) continue
    sheet.getCell(1, dynamicColumnIndex).value = `Subcategories for ${category.name}`
    sheet.getCell(1, dynamicColumnIndex).font = { bold: true }
    sheet.getColumn(dynamicColumnIndex).width = 30
    values.forEach((value, index) => {
      sheet.getCell(index + 2, dynamicColumnIndex).value = value
    })
    defineNamedRange(workbook, `subcat_${sanitizeRangeName(category.name)}`, LOOKUPS_SHEET, dynamicColumnIndex, 2, values.length + 1)
    dynamicColumnIndex += 1
  }

  const subcategoryNameById = new Map(lookups.subcategories.map((row) => [row.id, row.name]))
  const subcategoryCategoryById = new Map(lookups.subcategories.map((row) => [row.id, row.category_id]))
  const optionsByCategoryAndSubcategory = new Map<string, string[]>()
  for (const row of lookups.options) {
    const subcategoryName = subcategoryNameById.get(row.subcategory_id)
    const categoryId = subcategoryCategoryById.get(row.subcategory_id)
    const categoryName = lookups.categories.find((entry) => entry.id === categoryId)?.name
    if (!subcategoryName || !categoryName) continue
    const key = `${categoryName}__${subcategoryName}`
    optionsByCategoryAndSubcategory.set(key, [...(optionsByCategoryAndSubcategory.get(key) ?? []), row.name])
  }

  for (const [key, values] of optionsByCategoryAndSubcategory.entries()) {
    if (values.length === 0) continue
    sheet.getCell(1, dynamicColumnIndex).value = `Options for ${key.replace('__', ' / ')}`
    sheet.getCell(1, dynamicColumnIndex).font = { bold: true }
    sheet.getColumn(dynamicColumnIndex).width = 34
    values.forEach((value, index) => {
      sheet.getCell(index + 2, dynamicColumnIndex).value = value
    })
    defineNamedRange(workbook, `opt_${sanitizeRangeName(key)}`, LOOKUPS_SHEET, dynamicColumnIndex, 2, values.length + 1)
    dynamicColumnIndex += 1
  }

  sheet.state = 'hidden'
}

function applyListValidationFormula(sheet: ExcelJS.Worksheet, columnIndex: number, formula: string) {
  for (let row = 2; row <= MAX_TEMPLATE_ROWS + 1; row += 1) {
    sheet.getCell(row, columnIndex).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [formula.replaceAll('{row}', String(row))],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Choose from the list',
      error: 'Please pick a value from the dropdown list.',
    }
  }
}

export async function buildProductImportWorkbook(adminClient: AdminClient) {
  const lookups = await loadLookupMap(adminClient)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'OpenAI Codex'
  workbook.created = new Date()

  addInstructionsSheet(workbook)
  addLookupsSheet(workbook, lookups)

  const columns = PRODUCT_IMPORT_COLUMNS.filter((column) => column.group !== 'system')
  const sheet = workbook.addWorksheet(WORKSHEET_NAME, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.addRow(columns.map((column) => column.key))
  sheet.getRow(1).height = 24

  columns.forEach((column, index) => {
    const cell = sheet.getCell(1, index + 1)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: column.required ? 'FF166534' : 'FF92400E' },
    }
    cell.alignment = { vertical: 'middle' }
    cell.note = `${column.label}\n\n${column.description}\n\nExample: ${column.example}`
    sheet.getColumn(index + 1).width = Math.max(16, Math.min(32, column.key.length + 6))
  })

  const categoryColumnIndex = columns.findIndex((column) => column.key === 'category') + 1
  const subcategoryColumnIndex = columns.findIndex((column) => column.key === 'subcategory') + 1
  const categoryColumn = columnLetter(categoryColumnIndex)
  const subcategoryColumn = columnLetter(subcategoryColumnIndex)

  const helperCategoryKeyColumnIndex = columns.length + 2
  const helperSubcategoryKeyColumnIndex = columns.length + 3
  const helperSubcategoryRangeColumnIndex = columns.length + 4
  const helperOptionRangeColumnIndex = columns.length + 5

  const helperColumns = [
    { index: helperCategoryKeyColumnIndex, label: 'Category Key' },
    { index: helperSubcategoryKeyColumnIndex, label: 'Subcategory Key' },
    { index: helperSubcategoryRangeColumnIndex, label: 'Subcategory Range' },
    { index: helperOptionRangeColumnIndex, label: 'Option Range' },
  ]

  helperColumns.forEach((helper) => {
    sheet.getCell(1, helper.index).value = helper.label
    sheet.getColumn(helper.index).hidden = true
    sheet.getColumn(helper.index).width = 20
  })

  for (let row = 2; row <= MAX_TEMPLATE_ROWS + 1; row += 1) {
    const categoryCellRef = `$${categoryColumn}${row}`
    const subcategoryCellRef = `$${subcategoryColumn}${row}`

    sheet.getCell(row, helperCategoryKeyColumnIndex).value = {
      formula: excelNameExpression(categoryCellRef),
    }

    sheet.getCell(row, helperSubcategoryKeyColumnIndex).value = {
      formula: excelNameExpression(subcategoryCellRef),
    }

    sheet.getCell(row, helperSubcategoryRangeColumnIndex).value = {
      formula: `"subcat_"&${columnLetter(helperCategoryKeyColumnIndex)}${row}`,
    }

    sheet.getCell(row, helperOptionRangeColumnIndex).value = {
      formula: `"opt_"&${columnLetter(helperCategoryKeyColumnIndex)}${row}&"__"&${columnLetter(helperSubcategoryKeyColumnIndex)}${row}`,
    }
  }

  const validationTargets = new Map<string, string>([
    ['lane', 'lanes'],
    ['category', 'categories'],
    ['subcategory', `INDIRECT($${columnLetter(helperSubcategoryRangeColumnIndex)}{row})`],
    ['option_name', `INDIRECT($${columnLetter(helperOptionRangeColumnIndex)}{row})`],
    ['style_name', 'styles'],
    ['gst_slab_name', 'gst_slabs'],
    ['metal_1', 'metals'],
    ['metal_2', 'metals'],
    ['metal_3', 'metals'],
    ['certificate_1', 'certificates'],
    ['certificate_2', 'certificates'],
    ['material_value_1', 'material_values'],
    ['material_value_2', 'material_values'],
    ['material_value_3', 'material_values'],
    ['material_value_4', 'material_values'],
  ])

  columns.forEach((column, index) => {
    const formula = validationTargets.get(column.key)
    if (formula) {
      applyListValidationFormula(sheet, index + 1, formula)
    }
  })

  const firstCategory = lookups.categories[0]?.name ?? ''
  const firstSubcategory = lookups.subcategories.find((row) => row.category_id === lookups.categories[0]?.id)?.name ?? ''
  const firstOption =
    lookups.options.find(
      (row) =>
        row.subcategory_id ===
        lookups.subcategories.find((entry) => entry.name === firstSubcategory)?.id
    )?.name ?? ''

  const headerKeys = columns.map((column) => column.key)
  const exampleRow = headerKeys.map((key) => {
    switch (key) {
      case 'lane':
        return 'standard'
      case 'category':
        return firstCategory
      case 'subcategory':
        return firstSubcategory
      case 'option_name':
        return firstOption
      case 'style_name':
        return lookups.styles[0] ?? ''
      case 'gst_slab_name':
        return lookups.gst[0] ?? ''
      case 'metal_1':
        return lookups.metals[0] ?? ''
      case 'metal_2':
        return lookups.metals[1] ?? ''
      case 'certificate_1':
        return lookups.certificates[0] ?? ''
      case 'material_value_1':
        return lookups.materialValues[0] ?? ''
      case 'product_name':
        return 'Sample Product Name'
      case 'sku':
        return 'SAMPLE-001'
      case 'description':
        return 'Write the main product description here.'
      case 'stock_quantity':
        return 5
      case 'purity_1_label':
        return '18K'
      case 'purity_1_price':
        return 59999
      case 'image_1':
        return 'SAMPLE-001_main.jpg'
      default:
        return ''
    }
  })

  sheet.addRow(exampleRow)
  sheet.getRow(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
