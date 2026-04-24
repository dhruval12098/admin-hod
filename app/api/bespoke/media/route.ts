import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import sharp from 'sharp'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  const kind = formData?.get('kind')

  if (!(file instanceof File) || (kind !== 'image' && kind !== 'video')) {
    return NextResponse.json({ error: 'Invalid media upload request.' }, { status: 400 })
  }

  const isImage = kind === 'image'

  if (isImage && !allowedImageMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, AVIF, or SVG.' }, { status: 400 })
  }

  if (!isImage && !file.type.startsWith('video/')) {
    return NextResponse.json({ error: 'Only video files are allowed for video uploads.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : ''
  const safeVideoExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : 'mp4'
  const isSvg = isImage && file.type === 'image/svg+xml'
  const filePath = isImage
    ? `bespoke/images/${crypto.randomUUID()}.${isSvg ? 'svg' : 'webp'}`
    : `bespoke/videos/${crypto.randomUUID()}.${safeVideoExtension}`
  const uploadBuffer = isImage
    ? isSvg
      ? buffer
      : await sharp(buffer).rotate().resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
    : buffer
  const contentType = isImage
    ? isSvg
      ? 'image/svg+xml'
      : 'image/webp'
    : file.type || 'video/mp4'

  const { error: uploadError } = await access.adminClient.storage
    .from(collectionBucket)
    .upload(filePath, uploadBuffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = access.adminClient.storage.from(collectionBucket).getPublicUrl(filePath)

  return NextResponse.json({
    path: filePath,
    url: data.publicUrl,
  })
}
