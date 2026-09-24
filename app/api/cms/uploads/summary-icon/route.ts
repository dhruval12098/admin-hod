import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, AVIF, or SVG icon up to 2 MB.' }, { status: 400 })
  try {
    const image = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 96, effort: 5 }).toBuffer()
    const path = `summary-icons/${crypto.randomUUID()}.webp`
    const { error } = await access.adminClient.storage.from(bucket).upload(path, image, { contentType: 'image/webp', upsert: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url: access.adminClient.storage.from(bucket).getPublicUrl(path).data.publicUrl })
  } catch { return NextResponse.json({ error: 'Unable to process the icon image.' }, { status: 400 }) }
}
