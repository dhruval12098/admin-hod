import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionKey = 'home_hiphop_showcase'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('hiphop_showcase_section')
    .select('eyebrow, heading_line_1, heading_line_2, heading_emphasis, cta_label, cta_link, image_path, image_alt')
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const payload = {
    section_key: sectionKey,
    eyebrow: body.eyebrow ?? '',
    heading_line_1: body.heading_line_1 ?? '',
    heading_line_2: body.heading_line_2 ?? '',
    heading_emphasis: body.heading_emphasis ?? '',
    cta_label: body.cta_label ?? '',
    cta_link: body.cta_link ?? '/hiphop',
    image_path: body.image_path ?? null,
    image_alt: body.image_alt ?? 'House of Diams Hip Hop Collection',
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await access.adminClient
    .from('hiphop_showcase_section')
    .upsert(payload, { onConflict: 'section_key' })
    .select('eyebrow, heading_line_1, heading_line_2, heading_emphasis, cta_label, cta_link, image_path, image_alt')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
