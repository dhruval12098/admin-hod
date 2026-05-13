import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 })
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const isSvg = file.type === 'image/svg+xml'
  const fileName = `bespoke-process/${crypto.randomUUID()}.${isSvg ? 'svg' : 'webp'}`
  const uploadBuffer = isSvg ? buffer : await sharp(buffer).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  const { adminClient } = access
  const { error: uploadError } = await adminClient.storage.from(collectionBucket).upload(fileName, uploadBuffer, { contentType: isSvg ? 'image/svg+xml' : 'image/webp', upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
  const { data } = adminClient.storage.from(collectionBucket).getPublicUrl(fileName)
  if (!data?.publicUrl) return NextResponse.json({ error: 'Failed to generate public URL.' }, { status: 500 })
  return NextResponse.json({ path: fileName, url: data.publicUrl })
}
