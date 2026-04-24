import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'

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
  if (file.type !== 'image/svg+xml') return NextResponse.json({ error: 'Only SVG icons are allowed.' }, { status: 400 })
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `values/${crypto.randomUUID()}.svg`
  const { adminClient } = access
  const { error: uploadError } = await adminClient.storage.from(collectionBucket).upload(fileName, buffer, { contentType: 'image/svg+xml', upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
  const { data } = adminClient.storage.from(collectionBucket).getPublicUrl(fileName)
  if (!data?.publicUrl) return NextResponse.json({ error: 'Failed to generate public URL.' }, { status: 500 })
  return NextResponse.json({ path: fileName, url: data.publicUrl })
}
