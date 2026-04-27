import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedVideoMimeTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const allowedPosterMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxVideoSizeBytes = 100 * 1024 * 1024
const maxPosterSizeBytes = 5 * 1024 * 1024

function normalizeKind(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  const kind = normalizeKind(formData ? formData.get('kind') : null)

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  }

  if (kind !== 'video' && kind !== 'poster') {
    return NextResponse.json({ error: 'Invalid upload kind.' }, { status: 400 })
  }

  if (kind === 'video') {
    if (!allowedVideoMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Invalid video type. Use MP4, WebM, or MOV.' }, { status: 400 })
    }

    if (file.size > maxVideoSizeBytes) {
      return NextResponse.json({ error: 'Video too large. Max size is 100MB.' }, { status: 400 })
    }

    const extension = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4'
    const path = `diamond-info/videos/${crypto.randomUUID()}.${extension}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await access.adminClient.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data } = access.adminClient.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({ path, url: data.publicUrl })
  }

  if (!allowedPosterMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Invalid poster type. Use JPG, PNG, WebP, or AVIF.' }, { status: 400 })
  }

  if (file.size > maxPosterSizeBytes) {
    return NextResponse.json({ error: 'Poster too large. Max size is 5MB.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const path = `diamond-info/posters/${crypto.randomUUID()}.webp`
  const uploadBuffer = await sharp(buffer).rotate().resize({ width: 2200, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
  const { error } = await access.adminClient.storage.from(bucket).upload(path, uploadBuffer, {
    contentType: 'image/webp',
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = access.adminClient.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ path, url: data.publicUrl })
}
