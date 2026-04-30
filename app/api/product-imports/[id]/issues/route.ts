import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { getImportJobDetail } from '@/lib/import-jobs'

function escapeCsvCell(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

function toCsvRow(values: string[]) {
  return values.map((value) => escapeCsvCell(value)).join(',')
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const detail = await getImportJobDetail(id)
  if (!detail.job) {
    return NextResponse.json({ error: 'Import job not found.' }, { status: 404 })
  }

  const lines = [
    toCsvRow(['row_number', 'sku', 'product_name', 'row_status', 'issue_type', 'field_name', 'issue_code', 'message']),
  ]

  for (const row of detail.rows) {
    if (!row.issues || row.issues.length === 0) continue
    for (const issue of row.issues) {
      lines.push(
        toCsvRow([
          String(row.row_number),
          row.sku ?? '',
          row.product_name ?? '',
          row.status,
          issue.issue_type,
          issue.field_name ?? '',
          issue.issue_code ?? '',
          issue.message,
        ])
      )
    }
  }

  const safeName = (detail.job.job_name || detail.job.csv_file_name || `import-${detail.job.id}`)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')

  return new NextResponse(lines.join('\n') + '\n', {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${safeName}-issues.csv"`,
      'cache-control': 'no-store',
    },
  })
}

