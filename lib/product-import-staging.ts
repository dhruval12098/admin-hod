import 'server-only'

import ExcelJS from 'exceljs'
import { PRODUCT_IMPORT_COLUMNS } from '@/lib/product-import-templates'

export const productImportBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
export const productImportStagingFolder = 'imports/staging'
export const productImportMaxRows = 2000
export const productImportMaxCsvBytes = 5 * 1024 * 1024
export const productImportMaxWorkbookBytes = 8 * 1024 * 1024
export const productImportMaxArchiveBytes = 250 * 1024 * 1024

export type ParsedProductImportRow = Record<string, string>

const expectedHeaders = PRODUCT_IMPORT_COLUMNS.filter((column) => column.group !== 'system').map((column) => column.key)
const requiredHeaders = PRODUCT_IMPORT_COLUMNS.filter((column) => column.required).map((column) => column.key)

export function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
}

export function buildImportStoragePath(jobId: string, kind: 'csv' | 'archive', fileName: string) {
  return `${productImportStagingFolder}/${jobId}/${kind}-${sanitizeFileName(fileName)}`
}

export function parseCsvText(text: string) {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let inQuotes = false

  const normalizedText = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index]
    const nextChar = normalizedText[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentCell = ''
      currentRow = []
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  return rows
}

export function parseProductImportCsv(text: string) {
  const matrix = parseCsvText(text).filter((row) => row.some((cell) => cell.trim().length > 0))
  if (matrix.length < 2) {
    throw new Error('CSV must include headers and at least one product row.')
  }

  const headers = matrix[0].map((cell) => cell.trim())
  const missingHeaders = requiredHeaders.filter((key) => !headers.includes(key))
  if (missingHeaders.length > 0) {
    throw new Error(`CSV is missing required columns: ${missingHeaders.join(', ')}`)
  }

  const unknownHeaders = headers.filter((header) => !expectedHeaders.includes(header))
  if (unknownHeaders.length > 0) {
    throw new Error(`CSV includes unsupported columns: ${unknownHeaders.join(', ')}`)
  }

  const rows = matrix.slice(1).map((cells, rowIndex) => {
    const record: ParsedProductImportRow = {}
    headers.forEach((header, headerIndex) => {
      record[header] = (cells[headerIndex] ?? '').trim()
    })

    return {
      rowNumber: rowIndex + 2,
      values: record,
    }
  })

  if (rows.length > productImportMaxRows) {
    throw new Error(`CSV contains ${rows.length} rows. The current staging limit is ${productImportMaxRows} rows per upload.`)
  }

  return {
    headers,
    rows,
  }
}

function normalizeCellValue(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim()
  }
  if (typeof value === 'object' && 'result' in value && value.result != null) {
    return String(value.result).trim()
  }
  return String(value).trim()
}

export async function parseProductImportWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheet =
    workbook.getWorksheet('Product Upload') ??
    workbook.worksheets.find((worksheet) => worksheet.rowCount > 0)

  if (!sheet) {
    throw new Error('Workbook is empty. Please use the Product Upload sheet from the import template.')
  }

  const headerRow = sheet.getRow(1)
  const headers = headerRow.values
    .slice(1)
    .map((cell) => normalizeCellValue(cell))
    .filter((cell) => cell.length > 0)

  const missingHeaders = requiredHeaders.filter((key) => !headers.includes(key))
  if (missingHeaders.length > 0) {
    throw new Error(`Workbook is missing required columns: ${missingHeaders.join(', ')}`)
  }

  const unknownHeaders = headers.filter((header) => !expectedHeaders.includes(header))
  if (unknownHeaders.length > 0) {
    throw new Error(`Workbook includes unsupported columns: ${unknownHeaders.join(', ')}`)
  }

  const rows: Array<{ rowNumber: number; values: ParsedProductImportRow }> = []

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex)
    const record: ParsedProductImportRow = {}
    let hasAnyValue = false

    headers.forEach((header, headerIndex) => {
      const value = normalizeCellValue(row.getCell(headerIndex + 1).value)
      record[header] = value
      if (value.length > 0) hasAnyValue = true
    })

    if (!hasAnyValue) continue

    rows.push({
      rowNumber: rowIndex,
      values: record,
    })
  }

  if (rows.length < 1) {
    throw new Error('Workbook must include at least one filled product row.')
  }

  if (rows.length > productImportMaxRows) {
    throw new Error(`Workbook contains ${rows.length} rows. The current staging limit is ${productImportMaxRows} rows per upload.`)
  }

  return {
    headers,
    rows,
  }
}
