import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionKey = 'about_wide_banner'
const positions = new Set(['left', 'center', 'right', 'bottom-left', 'bottom-center', 'bottom-right'])

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.from('about_wide_banner')
    .select('id, section_key, is_enabled, desktop_image_path, mobile_image_path, image_alt, heading, paragraph, show_button, button_label, button_link, content_position, sort_order')
    .eq('section_key', sectionKey).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const clean = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
  const { data, error } = await access.adminClient.from('about_wide_banner').upsert({
    section_key: sectionKey, is_enabled: body.is_enabled === true,
    desktop_image_path: clean(body.desktop_image_path), mobile_image_path: clean(body.mobile_image_path), image_alt: clean(body.image_alt),
    heading: clean(body.heading), paragraph: clean(body.paragraph), show_button: body.show_button === true,
    button_label: clean(body.button_label), button_link: clean(body.button_link),
    content_position: 'bottom-center',
    sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 1, updated_at: new Date().toISOString(),
  }, { onConflict: 'section_key' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}


