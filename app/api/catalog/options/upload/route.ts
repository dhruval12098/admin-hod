import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  }

  if (file.type !== 'image/svg+xml') {
    return NextResponse.json({ error: 'Only SVG files are allowed.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `catalog/options/${crypto.randomUUID()}.svg`

  const { error: uploadError } = await access.adminClient.storage
    .from(collectionBucket)
    .upload(fileName, buffer, {
      contentType: 'image/svg+xml',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = access.adminClient.storage.from(collectionBucket).getPublicUrl(fileName)

  return NextResponse.json({
    path: fileName,
    url: data.publicUrl,
  })
}
