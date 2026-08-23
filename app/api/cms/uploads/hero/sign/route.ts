import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/webp', 'image/svg+xml'])

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null) as { contentType?: unknown } | null
  const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
  if (!allowedMimeTypes.has(contentType)) {
    return NextResponse.json({ error: 'Invalid direct hero image upload type.' }, { status: 400 })
  }

  const extension = contentType === 'image/svg+xml' ? 'svg' : 'webp'
  const path = `hero/${crypto.randomUUID()}.${extension}`
  const { data, error } = await access.adminClient.storage.from(bucket).createSignedUploadUrl(path)

  if (error || !data?.token) {
    return NextResponse.json({ error: error?.message ?? 'Unable to prepare direct hero upload.' }, { status: 500 })
  }

  const url = access.adminClient.storage.from(bucket).getPublicUrl(path).data.publicUrl
  return NextResponse.json({ bucket, path, token: data.token, url })
}
