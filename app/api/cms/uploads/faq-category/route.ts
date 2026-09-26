import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const rasterTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  if (![...rasterTypes, 'image/svg+xml'].includes(file.type)) return NextResponse.json({ error: 'Use SVG, PNG, JPG, or WebP.' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large. Max size is 5MB.' }, { status: 400 })
  const input = Buffer.from(await file.arrayBuffer())
  let output: Buffer<ArrayBufferLike> = input
  let extension = 'svg'
  let contentType = 'image/svg+xml'
  if (file.type === 'image/svg+xml') {
    const svg = input.toString('utf8')
    if (!/<svg[\s>]/i.test(svg) || /<script|<foreignObject|javascript:|\son\w+\s*=/i.test(svg)) return NextResponse.json({ error: 'Unsafe SVG content.' }, { status: 400 })
  } else {
    output = await sharp(input).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
    extension = 'webp'; contentType = 'image/webp'
  }
  const path = `support/faq-categories/${crypto.randomUUID()}.${extension}`
  const { error } = await access.adminClient.storage.from(bucket).upload(path, output, { contentType, upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = access.adminClient.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ path, url: data.publicUrl })
}
