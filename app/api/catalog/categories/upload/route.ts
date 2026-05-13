import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import sharp from 'sharp'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxFileSizeBytes = 6 * 1024 * 1024

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  const slug = typeof formData?.get('slug') === 'string' ? String(formData.get('slug')) : ''
  const variant = typeof formData?.get('variant') === 'string' ? String(formData.get('variant')) : 'desktop'

  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  if (file.size > maxFileSizeBytes) return NextResponse.json({ error: 'File too large. Max size is 6MB.' }, { status: 400 })
  if (!slug.trim()) return NextResponse.json({ error: 'Missing category slug.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeSlug = normalizeSlug(slug) || 'category'
  const safeVariant = variant === 'mobile' ? 'mobile' : 'desktop'
  const fileName = `category-banners/${safeSlug}/${safeVariant}-${crypto.randomUUID()}.webp`
  const uploadBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: safeVariant === 'mobile' ? 1400 : 2400, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer()

  const { adminClient } = access
  const { error: uploadError } = await adminClient.storage.from(bucket).upload(fileName, uploadBuffer, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data } = adminClient.storage.from(bucket).getPublicUrl(fileName)
  if (!data?.publicUrl) return NextResponse.json({ error: 'Failed to generate public URL.' }, { status: 500 })

  return NextResponse.json({ path: fileName, url: data.publicUrl })
}
