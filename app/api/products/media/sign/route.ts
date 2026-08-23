import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { createPresignedProductImageUpload, isR2Configured } from '@/lib/r2'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedImageMimeTypes = new Set(['image/webp', 'image/svg+xml'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null) as { folder?: unknown; contentType?: unknown; productKey?: unknown; declaredSize?: unknown } | null
  const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
  if (!allowedImageMimeTypes.has(contentType)) {
    return NextResponse.json({ error: 'Invalid direct image upload type.' }, { status: 400 })
  }

  const mediaFolder = body?.folder === 'hiphop' ? 'hiphop' : 'products'
  const declaredSize = typeof body?.declaredSize === 'number' ? body.declaredSize : Number.NaN
  if (!Number.isSafeInteger(declaredSize) || declaredSize < 1 || declaredSize > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Invalid prepared image size.' }, { status: 400 })
  }

  if (isR2Configured()) {
    try {
      const signed = await createPresignedProductImageUpload({
        folder: mediaFolder,
        productKey: typeof body?.productKey === 'string' ? body.productKey : null,
        contentType: contentType as 'image/webp' | 'image/svg+xml',
      })
      return NextResponse.json({
        provider: 'r2',
        path: signed.url,
        url: signed.url,
        uploadUrl: signed.uploadUrl,
        contentType,
      })
    } catch {
      // Preserve the existing Supabase signed upload as the automatic fallback.
    }
  }

  const extension = contentType === 'image/svg+xml' ? 'svg' : 'webp'
  const path = `${mediaFolder}/images/${crypto.randomUUID()}.${extension}`
  const { data, error } = await access.adminClient.storage
    .from(collectionBucket)
    .createSignedUploadUrl(path)

  if (error || !data?.token) {
    return NextResponse.json({ error: error?.message ?? 'Unable to prepare direct upload.' }, { status: 500 })
  }

  const publicUrl = access.adminClient.storage.from(collectionBucket).getPublicUrl(path).data.publicUrl
  return NextResponse.json({ provider: 'supabase', bucket: collectionBucket, path, token: data.token, url: publicUrl })
}
