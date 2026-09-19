import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing image file.' }, { status: 400 })
  if (!allowed.has(file.type)) return NextResponse.json({ error: 'Use JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image is larger than 8MB.' }, { status: 400 })
  const path = `checkout-result/${crypto.randomUUID()}.webp`
  const optimized = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 2200, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
  const { error } = await access.adminClient.storage.from(bucket).upload(path, optimized, { contentType: 'image/webp', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ path, url: access.adminClient.storage.from(bucket).getPublicUrl(path).data.publicUrl })
}
