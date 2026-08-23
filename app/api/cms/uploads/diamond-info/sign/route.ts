import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedVideoMimeTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const maxVideoSizeBytes = 100 * 1024 * 1024
const maxPosterSizeBytes = 5 * 1024 * 1024
const maxIconSizeBytes = 512 * 1024

type SignRequest = {
  kind?: unknown
  contentType?: unknown
  declaredSize?: unknown
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null) as SignRequest | null
  const kind = typeof body?.kind === 'string' ? body.kind : ''
  const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
  const declaredSize = typeof body?.declaredSize === 'number' ? body.declaredSize : Number.NaN

  if (!Number.isSafeInteger(declaredSize) || declaredSize < 0) {
    return NextResponse.json({ error: 'Invalid declared file size.' }, { status: 400 })
  }

  let path = ''
  if (kind === 'video') {
    if (!allowedVideoMimeTypes.has(contentType)) {
      return NextResponse.json({ error: 'Invalid video type. Use MP4, WebM, or MOV.' }, { status: 400 })
    }
    if (declaredSize > maxVideoSizeBytes) {
      return NextResponse.json({ error: 'Video too large. Max size is 100MB.' }, { status: 400 })
    }
    const extension = contentType === 'video/webm' ? 'webm' : contentType === 'video/quicktime' ? 'mov' : 'mp4'
    path = `diamond-info/videos/${crypto.randomUUID()}.${extension}`
  } else if (kind === 'poster') {
    if (contentType !== 'image/webp') {
      return NextResponse.json({ error: 'Invalid prepared poster type.' }, { status: 400 })
    }
    if (declaredSize > maxPosterSizeBytes) {
      return NextResponse.json({ error: 'Poster too large. Max size is 5MB.' }, { status: 400 })
    }
    path = `diamond-info/posters/${crypto.randomUUID()}.webp`
  } else if (kind === 'icon') {
    if (contentType !== 'image/svg+xml') {
      return NextResponse.json({ error: 'Invalid icon type. Use SVG only.' }, { status: 400 })
    }
    if (declaredSize > maxIconSizeBytes) {
      return NextResponse.json({ error: 'Icon too large. Max size is 512KB.' }, { status: 400 })
    }
    path = `diamond-info/icons/${crypto.randomUUID()}.svg`
  } else {
    return NextResponse.json({ error: 'Invalid upload kind.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data?.token) {
    return NextResponse.json({ error: error?.message ?? 'Unable to prepare upload.' }, { status: 500 })
  }

  return NextResponse.json({ bucket, path, token: data.token })
}
