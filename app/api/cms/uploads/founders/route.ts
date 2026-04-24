import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
const maxFileSizeBytes = 5 * 1024 * 1024

function buildAuthClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })
}

function buildAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

async function assertAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }) }
  const accessToken = authHeader.slice('Bearer '.length)
  const authClient = buildAuthClient(accessToken)
  const adminClient = buildAdminClient()
  if (!authClient || !adminClient) return { error: NextResponse.json({ error: 'Missing Supabase env vars.' }, { status: 500 }) }
  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData.user) return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  const { data: profile, error: profileError } = await adminClient.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profileError || profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  return { adminClient }
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  if (!allowedMimeTypes.has(file.type)) return NextResponse.json({ error: 'Invalid file type.' }, { status: 400 })
  if (file.size > maxFileSizeBytes) return NextResponse.json({ error: 'File too large. Max size is 5MB.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const isSvg = file.type === 'image/svg+xml'
  const fileName = isSvg ? `founders/${crypto.randomUUID()}.svg` : `founders/${crypto.randomUUID()}.webp`
  const uploadBuffer = isSvg ? buffer : await sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()

  const { adminClient } = access
  const { error } = await adminClient.storage.from(bucket).upload(fileName, uploadBuffer, {
    contentType: isSvg ? 'image/svg+xml' : 'image/webp',
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = adminClient.storage.from(bucket).getPublicUrl(fileName)
  return NextResponse.json({ path: fileName, url: data.publicUrl })
}
