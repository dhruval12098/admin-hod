import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { adminClient } = access
  const { data, error } = await adminClient.from('about_values').select('id, sort_order, icon_path, title, description').order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items)) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const { adminClient } = access
  const { error: deleteError } = await adminClient.from('about_values').delete().gte('sort_order', 0)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  const rows = body.items
    .filter((item: any) => typeof item.icon_path === 'string' && typeof item.title === 'string' && typeof item.description === 'string')
    .map((item: any, index: number) => ({
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
      icon_path: item.icon_path,
      title: item.title,
      description: item.description,
    }))
  if (rows.length > 0) {
    const { error: insertError } = await adminClient.from('about_values').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
