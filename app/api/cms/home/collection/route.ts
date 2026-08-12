import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type CollectionItem = {
  sort_order: number
  label: string
  title: string
  description: string
  image_path: string
  link: string
}

function normalizeItems(items: CollectionItem[]): CollectionItem[] {
  return items
    .map((item) => ({
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 0,
      label: String(item.label ?? '').trim(),
      title: String(item.title ?? '').trim(),
      description: String(item.description ?? '').trim(),
      image_path: String(item.image_path ?? '').trim(),
      link: String(item.link ?? '').trim(),
    }))
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }))
}

function buildAuthClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

function buildAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

async function assertAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }) }
  }

  const accessToken = authHeader.slice('Bearer '.length)
  const authClient = buildAuthClient(accessToken)
  const adminClient = buildAdminClient()

  if (!authClient || !adminClient) {
    return { error: NextResponse.json({ error: 'Missing Supabase env vars.' }, { status: 500 }) }
  }

  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return { adminClient }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { data, error } = await adminClient
    .from('collection_items')
    .select('sort_order, label, title, description, image_path, link')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const items = body.items.filter((item: CollectionItem) => {
    return (
      typeof item.sort_order === 'number' &&
      typeof item.label === 'string' &&
      typeof item.title === 'string' &&
      typeof item.description === 'string' &&
      typeof item.image_path === 'string' &&
      typeof item.link === 'string'
    )
  }) as CollectionItem[]
  const normalizedItems = normalizeItems(items)

  const { adminClient } = access

  // Replace the complete ordered collection. The previous `sort_order >= 0`
  // filter left legacy rows with null or negative order values in the table,
  // so removed cards could return after saving.
  const { error: orderedDeleteError } = await adminClient
    .from('collection_items')
    .delete()
    .not('sort_order', 'is', null)
  if (orderedDeleteError) {
    return NextResponse.json({ error: orderedDeleteError.message }, { status: 500 })
  }

  const { error: unorderedDeleteError } = await adminClient
    .from('collection_items')
    .delete()
    .is('sort_order', null)
  if (unorderedDeleteError) {
    return NextResponse.json({ error: unorderedDeleteError.message }, { status: 500 })
  }

  if (normalizedItems.length > 0) {
    const { error: insertError } = await adminClient.from('collection_items').insert(normalizedItems)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, items: normalizedItems })
}
