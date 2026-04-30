import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxFileSizeBytes = 5 * 1024 * 1024

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  }

  if (file.size > maxFileSizeBytes) {
    return NextResponse.json({ error: 'File too large. Max size is 5MB.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `home/discover-shapes/${crypto.randomUUID()}.webp`
  const uploadBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const { error: uploadError } = await access.adminClient.storage
    .from(collectionBucket)
    .upload(fileName, uploadBuffer, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = access.adminClient.storage.from(collectionBucket).getPublicUrl(fileName)
  return NextResponse.json({ path: fileName, url: data.publicUrl })
}
