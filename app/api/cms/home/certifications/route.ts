import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type CertificationItem = {
  sort_order: number
  title: string
  description?: string
  badge?: string
  icon_path: string
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
  const { data: section, error: sectionError } = await adminClient
    .from('certifications_section')
    .select('section_key, eyebrow, heading')
    .eq('section_key', 'home_certifications')
    .maybeSingle()

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  const { data: items, error: itemsError } = await adminClient
    .from('certifications_items')
    .select('id, sort_order, title, description, badge, icon_path')
    .order('sort_order', { ascending: true })

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({
    section: section ?? { section_key: 'home_certifications', eyebrow: 'Our Promise', heading: 'Why Choose House of Diams' },
    items: items ?? [],
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || !body.section || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  if (
    typeof body.section.eyebrow !== 'string' ||
    typeof body.section.heading !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid section payload.' }, { status: 400 })
  }

  const items = body.items.filter((item: CertificationItem) => {
    return (
      typeof item.sort_order === 'number' &&
      typeof item.title === 'string' &&
      typeof item.icon_path === 'string'
    )
  }) as CertificationItem[]

  const { adminClient } = access
  const { error: sectionError } = await adminClient.from('certifications_section').upsert({
    section_key: 'home_certifications',
    eyebrow: body.section.eyebrow,
    heading: body.section.heading,
  }, { onConflict: 'section_key' })

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  const { error: deleteError } = await adminClient.from('certifications_items').delete().gte('sort_order', 0)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (items.length > 0) {
    const normalizedItems = items.map((item) => ({
      sort_order: item.sort_order,
      title: item.title.trim(),
      description: typeof item.description === 'string' ? item.description.trim() : '',
      badge: typeof item.badge === 'string' ? item.badge.trim() : '',
      icon_path: item.icon_path.trim(),
    }))

    const { error: insertError } = await adminClient.from('certifications_items').insert(normalizedItems)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
