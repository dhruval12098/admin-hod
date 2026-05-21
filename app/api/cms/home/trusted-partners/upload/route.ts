import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/svg+xml', 'image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxFileSizeBytes = 3 * 1024 * 1024

function extensionFor(file: File) {
  if (file.type === 'image/svg+xml') return 'svg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/avif') return 'avif'
  return 'jpg'
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: 'Invalid logo type.' }, { status: 400 })
  if (file.size > maxFileSizeBytes) return NextResponse.json({ error: 'Logo file too large. Max size is 3MB.' }, { status: 400 })

  const ext = extensionFor(file)
  const fileName = `home/trusted-partners/${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await access.adminClient.storage.from(bucket).upload(fileName, buffer, {
    contentType: file.type,
    upsert: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = access.adminClient.storage.from(bucket).getPublicUrl(fileName)
  return NextResponse.json({ path: fileName, url: data.publicUrl })
}
