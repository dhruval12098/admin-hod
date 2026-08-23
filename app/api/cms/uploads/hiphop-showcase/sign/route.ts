import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowed = new Set(['image/webp', 'image/svg+xml'])
export async function POST(request: Request) {
  const access = await assertAdmin(request); if ('error' in access) return access.error
  const body = await request.json().catch(() => null) as { contentType?: unknown } | null
  const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
  if (!allowed.has(contentType)) return NextResponse.json({ error: 'Invalid Hip Hop showcase image type.' }, { status: 400 })
  const path = `hiphop-showcase/${crypto.randomUUID()}.${contentType === 'image/svg+xml' ? 'svg' : 'webp'}`
  const { data, error } = await access.adminClient.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data?.token) return NextResponse.json({ error: error?.message ?? 'Unable to prepare upload.' }, { status: 500 })
  return NextResponse.json({ bucket, path, token: data.token })
}
