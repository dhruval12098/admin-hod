import { NextResponse } from 'next/server'
import { buildAdminClient, buildAuthClient } from '@/lib/cms-auth'

const sectionKey = 'home_hiphop_showcase'

type HipHopSection = {
  eyebrow: string
  heading_line_1: string
  heading_line_2: string
  heading_emphasis: string
  cta_label: string
  cta_link: string
  image_path: string
  image_alt: string
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
    .from('hiphop_showcase_section')
    .select('eyebrow, heading_line_1, heading_line_2, heading_emphasis, cta_label, cta_link, image_path, image_alt')
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    section: data ?? {
      eyebrow: 'Hip Hop Collection · House of Diams',
      heading_line_1: 'Ice That',
      heading_line_2: 'Speaks',
      heading_emphasis: 'Louder.',
      cta_label: 'Shop Iced Pieces',
      cta_link: '/hiphop',
      image_path: '',
      image_alt: 'House of Diams Hip Hop Collection',
    },
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as HipHopSection | null
  if (
    !body ||
    typeof body.eyebrow !== 'string' ||
    typeof body.heading_line_1 !== 'string' ||
    typeof body.heading_line_2 !== 'string' ||
    typeof body.heading_emphasis !== 'string' ||
    typeof body.cta_label !== 'string' ||
    typeof body.cta_link !== 'string' ||
    typeof body.image_path !== 'string' ||
    typeof body.image_alt !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { adminClient } = access
  const { error } = await adminClient.from('hiphop_showcase_section').upsert(
    {
      section_key: sectionKey,
      eyebrow: body.eyebrow,
      heading_line_1: body.heading_line_1,
      heading_line_2: body.heading_line_2,
      heading_emphasis: body.heading_emphasis,
      cta_label: body.cta_label,
      cta_link: body.cta_link,
      image_path: body.image_path,
      image_alt: body.image_alt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'section_key' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
