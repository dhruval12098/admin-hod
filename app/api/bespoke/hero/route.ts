import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type HeroBody = {
  badge_text?: string | null
  eyebrow?: string | null
  heading_line_1?: string | null
  heading_line_2?: string | null
  subtitle?: string | null
  primary_cta_label?: string | null
  primary_cta_action?: string | null
  secondary_cta_label?: string | null
  secondary_cta_action?: string | null
  slider_enabled?: boolean
  status?: 'active' | 'hidden'
  items?: Array<{
    sort_order?: number
    image_path?: string
    mobile_image_path?: string
    button_text?: string
    button_link?: string
  }>
}

type HeroSectionRow = {
  id: number
  badge_text: string | null
  eyebrow: string | null
  heading_line_1: string | null
  heading_line_2: string | null
  subtitle: string | null
  primary_cta_label: string | null
  primary_cta_action: string | null
  secondary_cta_label: string | null
  secondary_cta_action: string | null
  slider_enabled?: boolean | null
  status: 'active' | 'hidden' | null
  updated_at: string | null
}

function isMissingSliderEnabledColumn(message?: string) {
  return Boolean(message?.includes("slider_enabled"))
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const sectionSelectWithToggle = 'id, badge_text, eyebrow, heading_line_1, heading_line_2, subtitle, primary_cta_label, primary_cta_action, secondary_cta_label, secondary_cta_action, slider_enabled, status, updated_at'
  const sectionSelectFallback = 'id, badge_text, eyebrow, heading_line_1, heading_line_2, subtitle, primary_cta_label, primary_cta_action, secondary_cta_label, secondary_cta_action, status, updated_at'

  const initialResult = await access.adminClient
    .from('bespoke_hero_content')
    .select(sectionSelectWithToggle)
    .order('updated_at', { ascending: false })
    .limit(1)

  let sections = (initialResult.data ?? []) as HeroSectionRow[]
  let error = initialResult.error

  const hasSliderColumn = !isMissingSliderEnabledColumn(error?.message)
  if (error && !hasSliderColumn) {
    const fallbackResult = await access.adminClient
      .from('bespoke_hero_content')
      .select(sectionSelectFallback)
      .order('updated_at', { ascending: false })
      .limit(1)
    sections = (fallbackResult.data ?? []) as HeroSectionRow[]
    error = fallbackResult.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const section = sections?.[0] ?? null

  if (!section) {
    return NextResponse.json({
      item: {
        badge_text: '',
        eyebrow: '',
        heading_line_1: '',
        heading_line_2: '',
        subtitle: '',
        primary_cta_label: '',
        primary_cta_action: '',
        secondary_cta_label: '',
        secondary_cta_action: '',
        slider_enabled: false,
        status: 'active',
      },
      items: [],
    })
  }

  const { data: items, error: itemsError } = await access.adminClient
    .from('bespoke_hero_slider_items')
    .select('id, sort_order, image_path, mobile_image_path, button_text, button_link')
    .eq('hero_id', section.id)
    .order('sort_order', { ascending: true })

  const safeItemsError = itemsError?.message?.includes("Could not find the table 'public.bespoke_hero_slider_items'")
  if (itemsError && !safeItemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  const safeItems = safeItemsError ? [] : (items ?? [])

  return NextResponse.json({
    item: {
      badge_text: section.badge_text ?? '',
      eyebrow: section.eyebrow ?? '',
      heading_line_1: section.heading_line_1 ?? '',
      heading_line_2: section.heading_line_2 ?? '',
      subtitle: section.subtitle ?? '',
      primary_cta_label: section.primary_cta_label ?? '',
      primary_cta_action: section.primary_cta_action ?? '',
      secondary_cta_label: section.secondary_cta_label ?? '',
      secondary_cta_action: section.secondary_cta_action ?? '',
      slider_enabled: hasSliderColumn ? Boolean(section.slider_enabled) : safeItems.some((item) => item.image_path?.trim()),
      status: section.status === 'hidden' ? 'hidden' : 'active',
    },
    items: safeItems,
  })
}

export async function PUT(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as HeroBody | null
  if (!body?.heading_line_1 || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const contentPayloadBase = {
    badge_text: body.badge_text ?? null,
    eyebrow: body.eyebrow ?? null,
    heading_line_1: body.heading_line_1,
    heading_line_2: body.heading_line_2 ?? null,
    subtitle: body.subtitle ?? null,
    primary_cta_label: body.primary_cta_label ?? null,
    primary_cta_action: body.primary_cta_action ?? null,
    secondary_cta_label: body.secondary_cta_label ?? null,
    secondary_cta_action: body.secondary_cta_action ?? null,
    status: body.status === 'hidden' ? 'hidden' : 'active',
    updated_at: new Date().toISOString(),
  }

  const { data: existingRows, error: existingError } = await access.adminClient
    .from('bespoke_hero_content')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

  const existing = existingRows?.[0]

  const buildContentQuery = (includeSliderEnabled: boolean) => {
    const contentPayload = includeSliderEnabled
      ? { ...contentPayloadBase, slider_enabled: Boolean(body.slider_enabled) }
      : contentPayloadBase

    return existing?.id
      ? access.adminClient.from('bespoke_hero_content').update(contentPayload).eq('id', existing.id)
      : access.adminClient.from('bespoke_hero_content').insert(contentPayload)
  }

  let saveResult = await buildContentQuery(true).select('id').single()
  if (saveResult.error && isMissingSliderEnabledColumn(saveResult.error.message)) {
    saveResult = await buildContentQuery(false).select('id').single()
  }

  const { data: savedContent, error: saveError } = saveResult
  if (saveError || !savedContent) return NextResponse.json({ error: saveError?.message ?? 'Unable to save hero.' }, { status: 500 })

  const { error: deleteError } = await access.adminClient
    .from('bespoke_hero_slider_items')
    .delete()
    .eq('hero_id', savedContent.id)

  const safeDeleteError = deleteError?.message?.includes("Could not find the table 'public.bespoke_hero_slider_items'")
  if (deleteError && !safeDeleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const shouldKeepSlides = Boolean(body.slider_enabled)
  const items = shouldKeepSlides
    ? body.items
        .filter(
          (item) =>
            typeof item.image_path === 'string' &&
            typeof item.button_text === 'string' &&
            typeof item.button_link === 'string',
        )
        .map((item, index) => ({
          hero_id: savedContent.id,
          sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
          image_path: item.image_path ?? '',
          mobile_image_path: typeof item.mobile_image_path === 'string' ? item.mobile_image_path : '',
          button_text: item.button_text ?? '',
          button_link: item.button_link ?? '',
        }))
    : []

  if (items.length > 0) {
    const { error: insertError } = await access.adminClient.from('bespoke_hero_slider_items').insert(items)
    const safeInsertError = insertError?.message?.includes("Could not find the table 'public.bespoke_hero_slider_items'")
    if (insertError && !safeInsertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
