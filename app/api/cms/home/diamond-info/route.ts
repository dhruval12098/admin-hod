import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type DiamondInfoFeatureItem = {
  id?: string
  sort_order: number
  icon_svg: string
  title: string
  description: string
  is_active: boolean
}

type DiamondInfoConfig = {
  video_enabled: boolean
  video_path: string
  video_poster_path: string
  layout_mode: string
  eyebrow: string
  section_heading: string
  section_subtext: string
  cta_label: string
  cta_link: string
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
  const [{ data: features, error: featuresError }, { data: config, error: configError }] = await Promise.all([
    adminClient
      .from('diamond_info_feature_items')
      .select('id, sort_order, icon_svg, title, description, is_active')
      .eq('section_key', 'home_diamond_info')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('diamond_info_config')
      .select('video_enabled, video_path, video_poster_path, layout_mode, eyebrow, section_heading, section_subtext, cta_label, cta_link')
      .eq('section_key', 'home_diamond_info')
      .maybeSingle(),
  ])

  const isMissingConfigTable =
    configError?.code === 'PGRST205' ||
    configError?.message?.includes("Could not find the table 'public.diamond_info_config'")

  const isMissingFeatureTable =
    featuresError?.code === 'PGRST205' ||
    featuresError?.message?.includes("Could not find the table 'public.diamond_info_feature_items'")

  if (featuresError && !isMissingFeatureTable) {
    return NextResponse.json({ error: featuresError.message }, { status: 500 })
  }

  if (configError && !isMissingConfigTable) {
    return NextResponse.json({ error: configError.message }, { status: 500 })
  }

  return NextResponse.json({
    features: isMissingFeatureTable ? [] : (features ?? []),
    config: {
      video_enabled: isMissingConfigTable ? true : (config?.video_enabled ?? true),
      video_path: isMissingConfigTable ? '' : (config?.video_path ?? ''),
      video_poster_path: isMissingConfigTable ? '' : (config?.video_poster_path ?? ''),
      layout_mode: isMissingConfigTable ? 'split_video_text' : (config?.layout_mode ?? 'split_video_text'),
      eyebrow: isMissingConfigTable ? '' : (config?.eyebrow ?? ''),
      section_heading: isMissingConfigTable ? '' : (config?.section_heading ?? ''),
      section_subtext: isMissingConfigTable ? '' : (config?.section_subtext ?? ''),
      cta_label: isMissingConfigTable ? '' : (config?.cta_label ?? ''),
      cta_link: isMissingConfigTable ? '' : (config?.cta_link ?? ''),
    },
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.features)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const features = body.features
    .filter((feature: DiamondInfoFeatureItem) => {
      return (
        typeof feature.title === 'string' &&
        typeof feature.description === 'string' &&
        typeof feature.icon_svg === 'string'
      )
    })
    .map((feature: DiamondInfoFeatureItem, index: number) => ({
      section_key: 'home_diamond_info',
      sort_order: index + 1,
      icon_svg: feature.icon_svg.trim() || null,
      title: feature.title.trim(),
      description: feature.description.trim(),
      is_active: feature.is_active !== false,
      updated_at: new Date().toISOString(),
    }))

  const rawConfig = body.config ?? {}
  const config: DiamondInfoConfig = {
    video_enabled: typeof rawConfig.video_path === 'string' && rawConfig.video_path.trim().length > 0,
    video_path: typeof rawConfig.video_path === 'string' ? rawConfig.video_path.trim() : '',
    video_poster_path: typeof rawConfig.video_poster_path === 'string' ? rawConfig.video_poster_path.trim() : '',
    layout_mode: 'split_video_text',
    eyebrow: typeof rawConfig.eyebrow === 'string' ? rawConfig.eyebrow.trim() : '',
    section_heading: typeof rawConfig.section_heading === 'string' ? rawConfig.section_heading.trim() : '',
    section_subtext: typeof rawConfig.section_subtext === 'string' ? rawConfig.section_subtext.trim() : '',
    cta_label: typeof rawConfig.cta_label === 'string' ? rawConfig.cta_label.trim() : '',
    cta_link: typeof rawConfig.cta_link === 'string' ? rawConfig.cta_link.trim() : '',
  }

  const { adminClient } = access

  const { error: deleteError } = await adminClient
    .from('diamond_info_feature_items')
    .delete()
    .eq('section_key', 'home_diamond_info')

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (features.length > 0) {
    const { error: insertError } = await adminClient.from('diamond_info_feature_items').insert(features)
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  const { error: configUpsertError } = await adminClient.from('diamond_info_config').upsert(
    {
      section_key: 'home_diamond_info',
      layout_mode: 'split_video_text',
      video_enabled: config.video_enabled,
      video_path: config.video_path || null,
      video_poster_path: config.video_poster_path || null,
      eyebrow: config.eyebrow || null,
      section_heading: config.section_heading || null,
      section_subtext: config.section_subtext || null,
      cta_label: config.cta_label || null,
      cta_link: config.cta_link || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'section_key' }
  )

  if (configUpsertError) {
    return NextResponse.json({ error: configUpsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
