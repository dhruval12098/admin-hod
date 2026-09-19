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
  const kind = String(form?.get('kind') ?? 'icon')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })

  if (kind === 'icon') {
    if (file.type !== 'image/svg+xml') return NextResponse.json({ error: 'Only SVG icons are allowed.' }, { status: 400 })
    const path = `values/icons/${crypto.randomUUID()}.svg`
    const { error } = await access.adminClient.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ path })
  }

  if (kind !== 'image' || !imageTypes.has(file.type) || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Use a JPG, PNG, WebP, or AVIF image up to 8MB.' }, { status: 400 })
  const path = `values/images/${crypto.randomUUID()}.webp`
  const output = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1400, height: 1750, fit: 'cover', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
  const { error } = await access.adminClient.storage.from(bucket).upload(path, output, { contentType: 'image/webp', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ path })
}
