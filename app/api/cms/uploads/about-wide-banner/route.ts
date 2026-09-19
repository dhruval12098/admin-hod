import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  if (!imageTypes.has(file.type) || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or AVIF image up to 8MB.' }, { status: 400 })
  const path = `about/wide-banner/${crypto.randomUUID()}.webp`
  const input = Buffer.from(await file.arrayBuffer())
  const output = await sharp(input).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
  const { error } = await access.adminClient.storage.from(bucket).upload(path, output, { contentType: 'image/webp', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ path })
}
