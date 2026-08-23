import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
export async function POST(request: Request) {
  const access = await assertAdmin(request); if ('error' in access) return access.error
  const body = await request.json().catch(() => null) as { contentType?: unknown } | null
  if (body?.contentType !== 'image/svg+xml') return NextResponse.json({ error: 'Only SVG icons are allowed.' }, { status: 400 })
  const path = `contact/${crypto.randomUUID()}.svg`
  const { data, error } = await access.adminClient.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data?.token) return NextResponse.json({ error: error?.message ?? 'Unable to prepare upload.' }, { status: 500 })
  return NextResponse.json({ bucket, path, token: data.token })
}
