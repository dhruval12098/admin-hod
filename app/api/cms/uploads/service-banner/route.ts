import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxFileSizeBytes = 8 * 1024 * 1024

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing image file.' }, { status: 400 })
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  if (file.size > maxFileSizeBytes) return NextResponse.json({ error: 'Image is larger than 8MB.' }, { status: 400 })

  const path = `service-banner/${crypto.randomUUID()}.webp`
  const source = Buffer.from(await file.arrayBuffer())
  const optimized = await sharp(source).rotate().resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
  const { error } = await access.adminClient.storage.from(bucket).upload(path, optimized, { contentType: 'image/webp', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = access.adminClient.storage.from(bucket).getPublicUrl(path).data.publicUrl
  return NextResponse.json({ path, url })
}