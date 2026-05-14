import 'server-only'

import ExcelJS from 'exceljs'
import { normalizeImportValue } from '@/lib/import-normalization'
import type { ParsedProductImportRow } from '@/lib/product-import-staging'

export type GoogleSheetSyncTab = 'Ring_Final' | 'Earring_Final' | 'Pendant_Final' | 'BrcBg'

export const SUPPORTED_GOOGLE_SHEET_TABS: GoogleSheetSyncTab[] = ['Ring_Final', 'Earring_Final', 'Pendant_Final', 'BrcBg']

type WideSheetRow = Record<string, string>

function normalizeCellValue(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') return value.text.trim()
  if (typeof value === 'object' && 'result' in value && value.result != null) return String(value.result).trim()
  return String(value).trim()
}

function normalizeLabel(value: string | null | undefined) {
  return normalizeImportValue(value)
}

export function extractSpreadsheetId(sheetUrl: string) {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? null
}

function buildWorkbookExportUrl(sheetUrl: string) {
  const spreadsheetId = extractSpreadsheetId(sheetUrl)
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheet link. Please use the full Google Sheets share URL.')
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`
}

function buildCsvExportUrl(sheetUrl: string, tabName: string) {
  const spreadsheetId = extractSpreadsheetId(sheetUrl)
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheet link. Please use the full Google Sheets share URL.')
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(tabName)}`
}

async function loadWorkbookFromSheetUrl(sheetUrl: string) {
  const exportUrl = buildWorkbookExportUrl(sheetUrl)
  const response = await fetch(exportUrl, {
    headers: {
      'user-agent': 'HouseOfDiams-Admin-Sync/1.0',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Unable to fetch Google Sheet workbook. Received ${response.status} from Google.`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer as never)
  return workbook
}

function parseNumericString(value: string) {
  const cleaned = value.replace(/,/g, '').trim()
  if (!cleaned) return ''
  const asNumber = Number(cleaned)
  return Number.isFinite(asNumber) ? String(asNumber) : ''
}

function splitCommaSeparatedValues(value: string | null | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function splitNormalizedValues(value: string | null | undefined) {
  return splitCommaSeparatedValues(value).map((entry) => normalizeLabel(entry)).filter(Boolean)
}

function uniqueLimitedValues(values: string[], maxCount: number) {
  const uniqueValues: string[] = []
  for (const value of values) {
    if (!uniqueValues.includes(value)) uniqueValues.push(value)
    if (uniqueValues.length >= maxCount) break
  }
  return uniqueValues
}

function mapMetalLabel(value: string) {
  const color = normalizeLabel(value)

  if (color.includes('yellow')) return 'Yellow Gold'
  if (color.includes('rose')) return 'Rose Gold'
  if (color.includes('white')) return 'White Gold'
  return value.trim()
}

function deriveMetalNames(row: WideSheetRow) {
  return uniqueLimitedValues(splitCommaSeparatedValues(row['Col']).map(mapMetalLabel).filter(Boolean), 3)
}

function deriveMaterialValues(row: WideSheetRow) {
  return uniqueLimitedValues(splitCommaSeparatedValues(row['Material']), 4)
}

function deriveCertificateValues(row: WideSheetRow) {
  const values = [
    ...splitCommaSeparatedValues(row['Certificate'] || row['Certificates']),
    ...splitCommaSeparatedValues(row['Certificate 1']),
    ...splitCommaSeparatedValues(row['Certificate 2']),
  ]

  return uniqueLimitedValues(values, 2)
}

function deriveImageValues(row: WideSheetRow) {
  const values = [
    ...splitCommaSeparatedValues(row['Image']),
    ...splitCommaSeparatedValues(row['Image 1']),
    ...splitCommaSeparatedValues(row['Image 2']),
    ...splitCommaSeparatedValues(row['Image 3']),
    ...splitCommaSeparatedValues(row['Image 4']),
  ]

  return uniqueLimitedValues(values, 4)
}

function titleFromFallback(row: WideSheetRow, tabName: GoogleSheetSyncTab) {
  const explicit = row['Title']
  if (explicit) return explicit

  const styleNo = row['Style No.'] || row['SKU'] || 'Imported'
  const shape = row['By Shape'] || ''
  const category = row['Category'] || tabName.replace('_Final', '').replace('BrcBg', 'Bracelet')
  return `${styleNo} ${shape} ${category}`.replace(/\s+/g, ' ').trim()
}

function descriptionFromFallback(row: WideSheetRow, tabName: GoogleSheetSyncTab) {
  const explicit = row['Description']
  if (explicit) return explicit

  const material = row['Material'] || 'fine jewellery'
  const theme = row['Design Theme'] || 'signature'
  return `Imported from Google Sheet (${tabName}). ${material} product in a ${theme.toLowerCase()} style. Please review and enrich this description before publishing.`
}

function hasAnySourceValue(values: string[], candidates: string[]) {
  return candidates.some((candidate) => values.includes(normalizeLabel(candidate)))
}

function resolveFromAliases(values: string[], aliases: Array<{ value: string; matchers: string[] }>) {
  for (const alias of aliases) {
    if (hasAnySourceValue(values, alias.matchers)) {
      return alias.value
    }
  }
  return ''
}

function categoryMapping(row: WideSheetRow, tabName: GoogleSheetSyncTab) {
  const rawCategoryValues = splitNormalizedValues(row['Category'])
  const rawSubcategoryValues = splitNormalizedValues(row['Sub-Cat.'])
  const rawShapeValues = splitNormalizedValues(row['By Shape'])
  const combinedValues = [...rawCategoryValues, ...rawSubcategoryValues, ...rawShapeValues]

  if (
    tabName === 'Ring_Final' ||
    hasAnySourceValue(combinedValues, ['ring', 'engagement rings', 'engagement', 'anniversary rings', 'engagement anniversary rings'])
  ) {
    const ringSubcategory =
      resolveFromAliases([...rawSubcategoryValues, ...rawShapeValues], [
        { value: 'Round rings', matchers: ['round rings', 'round'] },
        { value: 'star diamond', matchers: ['star diamond', 'star'] },
        { value: 'new dimaodn', matchers: ['new dimaodn', 'new diamond'] },
      ]) || 'Round rings'

    return {
      category: 'Engagement Rings',
      subcategory: ringSubcategory,
      option_name: '',
      lane: 'standard',
    }
  }

  if (
    tabName === 'Earring_Final' ||
    hasAnySourceValue(combinedValues, ['earring', 'earrings', 's925earring'])
  ) {
    const earringOption =
      resolveFromAliases(rawSubcategoryValues, [
        { value: 'Stud Earrings', matchers: ['stud earrings', 'stud', 'solitaire', 'solitare'] },
        { value: 'Drop & Dangle', matchers: ['drop & dangle', 'drop and dangle', 'drop dangle'] },
        { value: 'Hoops & Huggies  ', matchers: ['hoops & huggies', 'hoops and huggies', 'hoops', 'huggies'] },
        { value: 'Personalized & Charm ', matchers: ['personalized & charm', 'personalized and charm', 'personalized', 'charm'] },
        { value: 'Tennis Earrings', matchers: ['tennis earrings', 'tennis'] },
      ]) || 'Stud Earrings'

    return {
      category: 'Fine Jewellery',
      subcategory: 'Earrings',
      option_name: earringOption,
      lane: 'standard',
    }
  }

  if (
    tabName === 'Pendant_Final' ||
    hasAnySourceValue(combinedValues, ['pendant', 'pendants', 's925pendant'])
  ) {
    const pendantOption =
      resolveFromAliases(rawSubcategoryValues, [
        { value: 'Solitare', matchers: ['solitaire', 'solitare'] },
        { value: 'Bezel ', matchers: ['bezel'] },
        { value: 'Teardrop ', matchers: ['teardrop'] },
        { value: 'Tennis Necklace', matchers: ['tennis necklace'] },
        { value: 'Charm Necklace', matchers: ['charm necklace', 'charm'] },
        { value: 'Initials', matchers: ['initials', 'initial'] },
        { value: 'Toi-et moi', matchers: ['toi et moi', 'toi-et moi', 'toi et moi pendant'] },
      ]) || 'Solitare'

    return {
      category: 'Fine Jewellery',
      subcategory: 'Necklaces',
      option_name: pendantOption,
      lane: 'standard',
    }
  }

  if (
    tabName === 'BrcBg' ||
    hasAnySourceValue(combinedValues, ['bracelet', 'bracelets', 's925bracelet'])
  ) {
    const braceletOption =
      resolveFromAliases(rawSubcategoryValues, [
        { value: 'Bangles', matchers: ['bangles', 'bangle'] },
        { value: 'Tennis', matchers: ['tennis', 'tennis bracelet'] },
      ]) || 'Tennis'

    return {
      category: 'Fine Jewellery',
      subcategory: 'Bracelet',
      option_name: braceletOption,
      lane: 'standard',
    }
  }

  return {
    category: 'Fine Jewellery',
    subcategory: '',
    option_name: '',
    lane: 'standard',
  }
}

function derivePurityLabel(row: WideSheetRow) {
  const ktCode = normalizeLabel(row['KT\nCode'] || row['KT Code'])
  if (ktCode === '925') return '925'
  if (ktCode === '10') return '10K'
  if (ktCode === '14') return '14K'
  if (ktCode === '18') return '18K'
  return (row['KT\nCode'] || row['KT Code'] || '').trim()
}

function normalizeGender(row: WideSheetRow) {
  const gender = normalizeLabel(row['Gender'])
  if (gender.includes('men')) return 'for_him'
  if (gender.includes('women')) return 'for_her'
  return ''
}

function mapWideRowToImportRow(row: WideSheetRow, tabName: GoogleSheetSyncTab): ParsedProductImportRow {
  const mapping = categoryMapping(row, tabName)
  const imageValues = deriveImageValues(row)
  const metalValues = deriveMetalNames(row)
  const materialValues = deriveMaterialValues(row)
  const certificateValues = deriveCertificateValues(row)

  return {
    product_name: titleFromFallback(row, tabName),
    sku: (row['SKU'] || '').trim(),
    lane: mapping.lane,
    category: mapping.category,
    subcategory: mapping.subcategory,
    option_name: mapping.option_name,
    style_name: (row['Design Theme'] || '').trim(),
    description: descriptionFromFallback(row, tabName),
    stock_quantity: '1',
    discount_price: parseNumericString(row['NSP\nPrice'] || row['Nsp price (discounted price)'] || ''),
    gst_slab_name: 'GST 3%',
    metal_1: metalValues[0] || '',
    metal_2: metalValues[1] || '',
    metal_3: metalValues[2] || '',
    certificate_1: certificateValues[0] || '',
    certificate_2: certificateValues[1] || '',
    material_value_1: materialValues[0] || '',
    material_value_2: materialValues[1] || '',
    material_value_3: materialValues[2] || '',
    material_value_4: materialValues[3] || '',
    purity_1_label: derivePurityLabel(row),
    purity_1_price: parseNumericString(row['Display\nPrice'] || row['Display price (without discount price)'] || ''),
    purity_2_label: '',
    purity_2_price: '',
    purity_3_label: '',
    purity_3_price: '',
    image_1: imageValues[0] || '',
    image_2: imageValues[1] || '',
    image_3: imageValues[2] || '',
    image_4: imageValues[3] || '',
    video: (row['Video URL'] || row['Video'] || '').trim(),
    spec_1_key: row['Size/\nLength'] || row['Inch'] ? 'Size/Length' : '',
    spec_1_value: (row['Size/\nLength'] || row['Inch'] || '').trim(),
    spec_2_key: row['Width'] ? 'Width' : '',
    spec_2_value: (row['Width'] || '').trim(),
    spec_3_key: row['Height'] ? 'Height' : '',
    spec_3_value: (row['Height'] || '').trim(),
    spec_4_key: row['By Shape'] ? 'Shape' : '',
    spec_4_value: (row['By Shape'] || '').trim(),
    engraving_label: '',
    // raw business helpers carried through for downstream review/mapping visibility
    source_tab: tabName,
    source_category: (row['Category'] || '').trim(),
    source_subcategory: (row['Sub-Cat.'] || '').trim(),
    source_shape: (row['By Shape'] || '').trim(),
    source_gender: normalizeGender(row),
    source_material: (row['Material'] || '').trim(),
    source_gold_colour: (row['Col'] || '').trim(),
    source_kt_code: (row['KT\nCode'] || row['KT Code'] || '').trim(),
    source_style_no: (row['Style No.'] || '').trim(),
  }
}

export async function fetchGoogleSheetImportRows(sheetUrl: string, tabName: GoogleSheetSyncTab) {
  const headerRowIndex = 5
  const dataStartRowIndex = 6
  const workbook = await loadWorkbookFromSheetUrl(sheetUrl)
  const worksheet = workbook.getWorksheet(tabName)

  if (!worksheet) {
    throw new Error(`The tab "${tabName}" was not found in the Google Sheet export.`)
  }

  const headerValues = (worksheet.getRow(headerRowIndex).values as ExcelJS.CellValue[] | undefined) ?? []
  const headers = headerValues.map((cell) => normalizeCellValue(cell))

  if (!headers.some((header: string) => normalizeLabel(header) === 'sku')) {
    throw new Error(`The tab "${tabName}" does not look like the expected wide client format.`)
  }

  const rows: Array<{ rowNumber: number; values: ParsedProductImportRow }> = []

  for (let rowIndex = dataStartRowIndex; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = ((worksheet.getRow(rowIndex).values as ExcelJS.CellValue[] | undefined) ?? [])
    const wideRow: WideSheetRow = {}
    let hasAnyValue = false

    headers.forEach((header: string, headerIndex: number) => {
      if (!header) return
      const value = normalizeCellValue(row[headerIndex])
      wideRow[header] = value
      if (value) hasAnyValue = true
    })

    if (!hasAnyValue) continue
    if (!(wideRow['SKU'] || '').trim()) continue

    rows.push({
      rowNumber: rowIndex,
      values: mapWideRowToImportRow(wideRow, tabName),
    })
  }

  if (rows.length < 1) {
    throw new Error(`The tab "${tabName}" does not contain any filled product rows with SKU values.`)
  }

  return {
    workbookName: `google-sheet-${tabName}`,
    rows,
  }
}

export async function fetchGoogleSheetTabs(sheetUrl: string) {
  const workbook = await loadWorkbookFromSheetUrl(sheetUrl)
  const tabs = workbook.worksheets.map((worksheet) => worksheet.name)
  const supportedTabs = tabs.filter((tab): tab is GoogleSheetSyncTab =>
    SUPPORTED_GOOGLE_SHEET_TABS.includes(tab as GoogleSheetSyncTab)
  )

  return {
    tabs,
    supportedTabs,
  }
}
