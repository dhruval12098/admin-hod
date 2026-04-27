import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
const maxFileSizeBytes = 5 * 1024 * 1024

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, AVIF, or SVG.' }, { status: 400 })
  if (file.size > maxFileSizeBytes) return NextResponse.json({ error: 'File too large. Max size is 5MB.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const isSvg = file.type === 'image/svg+xml'
  const fileName = isSvg ? `promotion-popup/${crypto.randomUUID()}.svg` : `promotion-popup/${crypto.randomUUID()}.webp`
  const uploadBuffer = isSvg
    ? buffer
    : await sharp(buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()

  const { adminClient } = access
  const { error } = await adminClient.storage.from(bucket).upload(fileName, uploadBuffer, {
    contentType: isSvg ? 'image/svg+xml' : 'image/webp',
    upsert: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = adminClient.storage.from(bucket).getPublicUrl(fileName)
  return NextResponse.json({ path: fileName, url: data.publicUrl })
}
