import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function buildAuthClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } })
}
function buildAdminClient() { if (!supabaseUrl || !supabaseServiceRoleKey) return null; return createClient(supabaseUrl, supabaseServiceRoleKey) }
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
export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { adminClient } = access
  const { data, error } = await adminClient.from('contact_hero').select('id, section_key, eyebrow, heading, subtitle').eq('section_key', 'contact_hero').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data ?? null })
}
export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || typeof body.eyebrow !== 'string' || typeof body.heading !== 'string' || typeof body.subtitle !== 'string') return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const { adminClient } = access
  const { error } = await adminClient.from('contact_hero').upsert({ section_key: 'contact_hero', eyebrow: body.eyebrow, heading: body.heading, subtitle: body.subtitle }, { onConflict: 'section_key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
