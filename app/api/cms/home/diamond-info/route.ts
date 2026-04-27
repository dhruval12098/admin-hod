import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type DiamondInfoItem = {
  sort_order: number
  label: string
  heading: string
  paragraph: string
}

type DiamondInfoConfig = {
  video_enabled: boolean
  video_path: string
  video_poster_path: string
}

function buildAuthClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

function buildAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null
  }

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
  const [{ data, error }, { data: config, error: configError }] = await Promise.all([
    adminClient
      .from('diamond_info_sections')
      .select('sort_order, label, heading, paragraph')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('diamond_info_config')
      .select('video_enabled, video_path, video_poster_path')
      .eq('section_key', 'home_diamond_info')
      .maybeSingle(),
  ])

  const isMissingConfigTable =
    configError?.code === 'PGRST205' ||
    configError?.message?.includes("Could not find the table 'public.diamond_info_config'")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (configError && !isMissingConfigTable) {
    return NextResponse.json({ error: configError.message }, { status: 500 })
  }

  return NextResponse.json({
    items: data ?? [],
    config: {
      video_enabled: isMissingConfigTable ? false : (config?.video_enabled ?? false),
      video_path: isMissingConfigTable ? '' : (config?.video_path ?? ''),
      video_poster_path: isMissingConfigTable ? '' : (config?.video_poster_path ?? ''),
    },
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const items = body.items.filter((item: DiamondInfoItem) => {
    return (
      typeof item.sort_order === 'number' &&
      typeof item.label === 'string' &&
      typeof item.heading === 'string' &&
      typeof item.paragraph === 'string'
    )
  }) as DiamondInfoItem[]

  const rawConfig = body.config ?? {}
  const config: DiamondInfoConfig = {
    video_enabled: rawConfig.video_enabled === true,
    video_path: typeof rawConfig.video_path === 'string' ? rawConfig.video_path : '',
    video_poster_path: typeof rawConfig.video_poster_path === 'string' ? rawConfig.video_poster_path : '',
  }

  const { adminClient } = access
  const { error: deleteError } = await adminClient.from('diamond_info_sections').delete().gte('sort_order', 0)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (items.length > 0) {
    const { error: insertError } = await adminClient.from('diamond_info_sections').insert(items)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  const { error: configUpsertError } = await adminClient.from('diamond_info_config').upsert(
    {
      section_key: 'home_diamond_info',
      video_enabled: config.video_enabled,
      video_path: config.video_path || null,
      video_poster_path: config.video_poster_path || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'section_key' }
  )

  if (configUpsertError) {
    return NextResponse.json({ error: configUpsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
