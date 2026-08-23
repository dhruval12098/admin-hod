import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import {
  productImportBucket,
  productImportMaxArchiveBytes,
  productImportStagingFolder,
  sanitizeFileName,
} from '@/lib/product-import-staging'

const allowedArchiveMimeTypes = new Set(['application/zip', 'application/x-zip-compressed'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null) as {
    fileName?: unknown
    contentType?: unknown
    fileSize?: unknown
  } | null
  const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : ''
  const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
  const fileSize = typeof body?.fileSize === 'number' ? body.fileSize : Number.NaN
  const isZipName = fileName.toLowerCase().endsWith('.zip')

  if (!fileName || (!allowedArchiveMimeTypes.has(contentType) && !isZipName)) {
    return NextResponse.json({ error: 'Only ZIP archives can use this direct upload.' }, { status: 400 })
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > productImportMaxArchiveBytes) {
    return NextResponse.json({ error: 'ZIP archive must be larger than 0 bytes and no more than 250 MB.' }, { status: 400 })
  }

  const safeName = sanitizeFileName(fileName)
  const path = `${productImportStagingFolder}/pending/${access.user.id}/${crypto.randomUUID()}-${safeName}`
  const { data, error } = await access.adminClient.storage.from(productImportBucket).createSignedUploadUrl(path)
  if (error || !data?.token) {
    return NextResponse.json({ error: error?.message ?? 'Unable to prepare direct ZIP upload.' }, { status: 500 })
  }

  return NextResponse.json({
    bucket: productImportBucket,
    path,
    token: data.token,
    fileName,
    contentType: contentType || 'application/zip',
    fileSize,
  })
}
