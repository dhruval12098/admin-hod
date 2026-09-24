import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { readHomeGroup1Envelope, saveHomeGroup1 } from '@/lib/cms-home-group1-save'

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

  const envelope = readHomeGroup1Envelope(body)
  if (!envelope) return NextResponse.json({ error: 'This editor is out of date. Reload it before saving.' }, { status: 409 })

  const items = body.items.map((item: HeroSlide & { id?: number }, index: number) => ({
        ...(item.id ? { id: item.id } : {}),
        sort_order: index + 1,
        image_path: item.image_path,
        mobile_image_path: item.mobile_image_path ?? '',
        headline: item.headline,
        subtitle: item.subtitle,
        button_text: item.button_text,
        button_link: item.button_link,
      }))
  return saveHomeGroup1(access, 'hero', envelope, {
    slider_enabled: body.slider_enabled,
    seo_title: body.seo_title.trim(),
    seo_description: body.seo_description.trim(),
  }, items)
}
