import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionKey = 'home_hero'

type HeroSlide = {
  sort_order: number
  image_path: string
  mobile_image_path?: string
  headline: string
  subtitle: string
  button_text: string
  button_link: string
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { data: section, error: sectionError } = await adminClient
    .from('homepage_hero')
    .select('id, eyebrow, headline, subtitle, slider_enabled, seo_title, seo_description')
    .eq('section_key', sectionKey)
    .single()

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  const { data: items, error: itemsError } = await adminClient
    .from('homepage_hero_slider_items')
    .select('id, sort_order, image_path, mobile_image_path, headline, subtitle, button_text, button_link')
    .eq('hero_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({
    section: {
      eyebrow: section.eyebrow,
      headline: section.headline,
      subtitle: section.subtitle,
      slider_enabled: section.slider_enabled ?? false,
      seo_title: section.seo_title ?? '',
      seo_description: section.seo_description ?? '',
    },
    items: (items ?? []).map((item) => ({ ...item, headline: item.headline ?? '', subtitle: item.subtitle ?? '' })),
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)

  if (
    !body ||
    typeof body.seo_title !== 'string' ||
    typeof body.seo_description !== 'string' ||
    typeof body.slider_enabled !== 'boolean' ||
    !Array.isArray(body.items)
  ) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const hasInvalidSlide = body.items.some((item: unknown) => {
    if (!item || typeof item !== 'object') return true
    const slide = item as Partial<HeroSlide>
    return (
      typeof slide.image_path !== 'string' ||
      (typeof slide.mobile_image_path !== 'string' && typeof slide.mobile_image_path !== 'undefined') ||
      typeof slide.headline !== 'string' ||
      typeof slide.subtitle !== 'string' ||
      typeof slide.button_text !== 'string' ||
      typeof slide.button_link !== 'string'
    )
  })

  if (hasInvalidSlide) {
    return NextResponse.json({ error: 'Invalid hero slide payload.' }, { status: 400 })
  }

  const { adminClient } = access
  const { data: hero, error: updateError } = await adminClient
    .from('homepage_hero')
    .update({
      slider_enabled: body.slider_enabled,
      seo_title: body.seo_title.trim() || null,
      seo_description: body.seo_description.trim() || null,
      is_active: true,
    })
    .eq('section_key', sectionKey)
    .select('id')
    .single()

  if (updateError || !hero) {
    return NextResponse.json({ error: updateError?.message ?? 'Unable to save hero content.' }, { status: 500 })
  }

  const { error: deleteError } = await adminClient
    .from('homepage_hero_slider_items')
    .delete()
    .eq('hero_id', hero.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  const items: HeroSlide[] = body.items
      .map((item: HeroSlide, index: number) => ({
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
        image_path: item.image_path,
        mobile_image_path: item.mobile_image_path ?? '',
        headline: item.headline,
        subtitle: item.subtitle,
        button_text: item.button_text,
        button_link: item.button_link,
      }))

  if (items.length > 0) {
      const rows = items.map((item) => ({
        hero_id: hero.id,
        sort_order: item.sort_order,
        image_path: item.image_path,
        mobile_image_path: item.mobile_image_path ?? '',
        headline: item.headline,
        subtitle: item.subtitle,
        button_text: item.button_text,
        button_link: item.button_link,
      }))

    const { error: insertError } = await adminClient.from('homepage_hero_slider_items').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
