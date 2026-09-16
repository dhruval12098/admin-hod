import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import sharp from 'sharp'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/svg+xml', 'image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxFileSizeBytes = 6 * 1024 * 1024

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use SVG, JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  }
  if (file.size > maxFileSizeBytes) return NextResponse.json({ error: 'File too large. Max size is 6MB.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const isSvg = file.type === 'image/svg+xml'
  const fileName = `catalog/options/${crypto.randomUUID()}.${isSvg ? 'svg' : 'webp'}`
  const uploadBuffer = isSvg
    ? buffer
    : await sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
  const contentType = isSvg ? 'image/svg+xml' : 'image/webp'

  const { error: uploadError } = await access.adminClient.storage
    .from(collectionBucket)
    .upload(fileName, uploadBuffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = access.adminClient.storage.from(collectionBucket).getPublicUrl(fileName)

  return NextResponse.json({
    path: fileName,
    url: data.publicUrl,
  })
}
