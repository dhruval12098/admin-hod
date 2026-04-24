import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sectionKey = 'home_hero'

type HeroSlide = {
  sort_order: number
  image_path: string
  button_text: string
  button_link: string
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
    .from('homepage_hero')
    .select('id, eyebrow, headline, subtitle, slider_enabled')
    .eq('section_key', sectionKey)
    .single()

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  const { data: items, error: itemsError } = await adminClient
    .from('homepage_hero_slider_items')
    .select('id, sort_order, image_path, button_text, button_link')
    .eq('hero_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({
    section: {
      eyebrow: section.eyebrow,
      headline: section.headline,
      subtitle: section.subtitle,
      slider_enabled: section.slider_enabled ?? false,
    },
    items: items ?? [],
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)

  if (
    !body ||
    typeof body.eyebrow !== 'string' ||
    typeof body.headline !== 'string' ||
    typeof body.subtitle !== 'string' ||
    typeof body.slider_enabled !== 'boolean' ||
    !Array.isArray(body.items)
  ) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { adminClient } = access
  const { data: hero, error: upsertError } = await adminClient
    .from('homepage_hero')
    .upsert(
      {
        section_key: sectionKey,
        eyebrow: body.eyebrow,
        headline: body.headline,
        subtitle: body.subtitle,
        slider_enabled: body.slider_enabled,
        is_active: true,
      },
      { onConflict: 'section_key' }
    )
    .select('id')
    .single()

  if (upsertError || !hero) {
    return NextResponse.json({ error: upsertError?.message ?? 'Unable to save hero content.' }, { status: 500 })
  }

  const { error: deleteError } = await adminClient
    .from('homepage_hero_slider_items')
    .delete()
    .eq('hero_id', hero.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const items: HeroSlide[] = body.items
    .filter((item: HeroSlide) =>
      typeof item.image_path === 'string' &&
      typeof item.button_text === 'string' &&
      typeof item.button_link === 'string'
    )
    .map((item: HeroSlide, index: number) => ({
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
      image_path: item.image_path,
      button_text: item.button_text,
      button_link: item.button_link,
    }))

  if (items.length > 0) {
    const rows = items.map((item) => ({
      hero_id: hero.id,
      sort_order: item.sort_order,
      image_path: item.image_path,
      button_text: item.button_text,
      button_link: item.button_link,
    }))

    const { error: insertError } = await adminClient.from('homepage_hero_slider_items').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
