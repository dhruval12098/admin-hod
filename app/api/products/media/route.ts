import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
const allowedVideoMimeTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  const kind = formData?.get('kind')
  const folder = formData?.get('folder')

  if (!(file instanceof File) || (kind !== 'image' && kind !== 'video')) {
    return NextResponse.json({ error: 'Invalid media upload request.' }, { status: 400 })
  }

  const mediaFolder = folder === 'hiphop' ? 'hiphop' : 'products'
  const buffer = Buffer.from(await file.arrayBuffer())

  if (kind === 'image') {
    if (!allowedImageMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WEBP, AVIF, or SVG images are allowed.' }, { status: 400 })
    }

    const isSvg = file.type === 'image/svg+xml'
    const filePath = `${mediaFolder}/images/${crypto.randomUUID()}.${isSvg ? 'svg' : 'webp'}`
    const uploadBuffer = isSvg
      ? buffer
      : await sharp(buffer).rotate().resize({ width: 2200, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()

    const { error: uploadError } = await access.adminClient.storage
      .from(collectionBucket)
      .upload(filePath, uploadBuffer, {
        contentType: isSvg ? 'image/svg+xml' : 'image/webp',
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

  if (!allowedVideoMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Only MP4, MOV, or WEBM videos are allowed.' }, { status: 400 })
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : ''
  const safeExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : 'mp4'
  const filePath = `${mediaFolder}/videos/${crypto.randomUUID()}.${safeExtension}`

  const { error: uploadError } = await access.adminClient.storage
    .from(collectionBucket)
    .upload(filePath, buffer, {
      contentType: file.type || 'video/mp4',
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
