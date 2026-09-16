import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionKey = 'home_hero'
const selectFields = 'id, hero_id, sort_order, image_path, mobile_image_path, headline, subtitle, button_text, button_link'

function parseSlideId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

async function getHomeHeroId(adminClient: NonNullable<Awaited<ReturnType<typeof assertAdmin>>['adminClient']>) {
  const { data, error } = await adminClient
    .from('homepage_hero')
    .select('id')
    .eq('section_key', sectionKey)
    .single()

  return { heroId: data?.id as number | undefined, error }
}

export async function GET(request: Request, { params }: { params: Promise<{ slideId: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const slideId = parseSlideId((await params).slideId)
  if (!slideId) return NextResponse.json({ error: 'Invalid slide ID.' }, { status: 400 })

  const { heroId, error: heroError } = await getHomeHeroId(access.adminClient)
  if (heroError || !heroId) return NextResponse.json({ error: heroError?.message ?? 'Hero section not found.' }, { status: 404 })

  const { data, error } = await access.adminClient
    .from('homepage_hero_slider_items')
    .select(selectFields)
    .eq('id', slideId)
    .eq('hero_id', heroId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Hero slide not found.' }, { status: 404 })
  return NextResponse.json({ slide: data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slideId: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const slideId = parseSlideId((await params).slideId)
  if (!slideId) return NextResponse.json({ error: 'Invalid slide ID.' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const allowedFields = ['headline', 'subtitle', 'image_path', 'mobile_image_path', 'button_text', 'button_link'] as const
  if (!body || typeof body !== 'object' || allowedFields.some((field) => typeof body[field] !== 'string')) {
    return NextResponse.json({ error: 'All slide fields must be strings.' }, { status: 400 })
  }

  const { heroId, error: heroError } = await getHomeHeroId(access.adminClient)
  if (heroError || !heroId) return NextResponse.json({ error: heroError?.message ?? 'Hero section not found.' }, { status: 404 })

  const update = Object.fromEntries(allowedFields.map((field) => [field, body[field]]))
  const { data, error } = await access.adminClient
    .from('homepage_hero_slider_items')
    .update(update)
    .eq('id', slideId)
    .eq('hero_id', heroId)
    .select(selectFields)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Hero slide not found.' }, { status: 404 })
  return NextResponse.json({ slide: data })
}
