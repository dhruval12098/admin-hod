import { NextResponse } from 'next/server'
import { buildAdminClient, buildAuthClient } from '@/lib/cms-auth'

const sectionKey = 'hiphop_hero'

type HipHopSection = {
  eyebrow: string
  headline: string
  subtitle: string
  slider_enabled: boolean
  items: Array<{
    sort_order: number
    image_path: string
    mobile_image_path?: string
    button_text: string
    button_link: string
  }>
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
  const { data: section, error } = await adminClient
    .from('hiphop_hero_content')
    .select('*')
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!section) {
    return NextResponse.json({
      section: {
        eyebrow: 'Hip Hop',
        headline: 'Hip Hop Jewellery',
        subtitle: 'Fully iced chains, grillz, pendants and statement rings - handcrafted with CVD diamonds in 14K and 18K gold.',
        slider_enabled: false,
      },
      items: [],
    })
  }

  const { data: items, error: itemsError } = await adminClient
    .from('hiphop_hero_slider_items')
    .select('id, sort_order, image_path, mobile_image_path, button_text, button_link')
    .eq('hero_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({
    section: {
      eyebrow: section.eyebrow ?? 'Hip Hop',
      headline: section.headline ?? 'Hip Hop Jewellery',
      subtitle: section.subtitle ?? '',
      slider_enabled: section.slider_enabled ?? false,
    },
    items: items ?? [],
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as HipHopSection | null
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
  const { data: section, error } = await adminClient.from('hiphop_hero_content').upsert(
    {
      section_key: sectionKey,
      eyebrow: body.eyebrow,
      headline: body.headline,
      subtitle: body.subtitle,
      slider_enabled: body.slider_enabled,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'section_key' }
  ).select('id').single()

  if (error || !section) return NextResponse.json({ error: error?.message ?? 'Unable to save hero.' }, { status: 500 })

  const { error: deleteError } = await adminClient.from('hiphop_hero_slider_items').delete().eq('hero_id', section.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const items = body.items
    .filter((item: any) => typeof item.image_path === 'string' && typeof item.button_text === 'string' && typeof item.button_link === 'string')
    .map((item: any, index: number) => ({
      hero_id: section.id,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
      image_path: item.image_path,
      mobile_image_path: typeof item.mobile_image_path === 'string' ? item.mobile_image_path : '',
      button_text: item.button_text,
      button_link: item.button_link,
    }))

  if (items.length > 0) {
    const { error: insertError } = await adminClient.from('hiphop_hero_slider_items').insert(items)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
