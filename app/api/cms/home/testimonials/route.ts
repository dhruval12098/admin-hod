import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sectionKey = 'home_testimonial_marquee'

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
  const { data: marquee, error: marqueeError } = await adminClient
    .from('testimonial_marquee')
    .select('id, title')
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (marqueeError) {
    return NextResponse.json({ error: marqueeError.message }, { status: 500 })
  }

  if (!marquee) {
    return NextResponse.json({ title: 'Loved by Clients Worldwide', items: [] })
  }

  const { data: items, error: itemsError } = await adminClient
    .from('testimonial_marquee_items')
    .select('id, sort_order, quote, author')
    .eq('marquee_id', marquee.id)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({
    title: marquee.title,
    items: items ?? [],
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body.title !== 'string' || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { adminClient } = access
  const { data: marquee, error: marqueeError } = await adminClient
    .from('testimonial_marquee')
    .upsert(
      {
        section_key: sectionKey,
        title: body.title,
      },
      { onConflict: 'section_key' }
    )
    .select('id')
    .single()

  if (marqueeError || !marquee) {
    return NextResponse.json({ error: marqueeError?.message ?? 'Unable to save marquee.' }, { status: 500 })
  }

  const { error: deleteError } = await adminClient
    .from('testimonial_marquee_items')
    .delete()
    .eq('marquee_id', marquee.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const rows = body.items
    .filter((item: { quote?: unknown; author?: unknown }) => typeof item.quote === 'string' && typeof item.author === 'string')
    .map((item: { sort_order?: unknown; quote: string; author: string }, index: number) => ({
      marquee_id: marquee.id,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
      quote: item.quote,
      author: item.author,
    }))

  if (rows.length > 0) {
    const { error: insertError } = await adminClient.from('testimonial_marquee_items').insert(rows)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
