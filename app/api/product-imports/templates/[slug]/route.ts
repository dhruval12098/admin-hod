import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import {
  buildBlankProductImportCsv,
  buildProductImportImageGuide,
  buildSampleProductImportCsv,
} from '@/lib/product-import-templates'
import { buildProductImportWorkbook } from '@/lib/product-import-workbook'

function fileNameForSlug(slug: string) {
  switch (slug) {
    case 'excel-template':
      return 'product-import-template.xlsx'
    case 'blank-csv':
      return 'product-import-template-blank.csv'
    case 'sample-csv':
      return 'product-import-template-sample.csv'
    case 'image-guide':
      return 'product-import-image-guide.txt'
    default:
      return null
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { slug } = await params
  const fileName = fileNameForSlug(slug)

  if (!fileName) {
    return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
  }

  const body =
    slug === 'excel-template'
      ? await buildProductImportWorkbook(access.adminClient as any)
      : slug === 'blank-csv'
        ? buildBlankProductImportCsv()
        : slug === 'sample-csv'
          ? buildSampleProductImportCsv()
          : buildProductImportImageGuide()

  return new NextResponse(body, {
    headers: {
      'content-type':
        slug === 'excel-template'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : slug === 'image-guide'
            ? 'text/plain; charset=utf-8'
            : 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${fileName}"`,
      'cache-control': 'no-store',
    },
  })
}
