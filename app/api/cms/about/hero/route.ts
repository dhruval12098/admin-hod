import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionKey = 'about_hero'
const positions = new Set(['left', 'center', 'right', 'bottom-left', 'bottom-center', 'bottom-right'])

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.from('about_hero')
    .select('id, section_key, is_enabled, media_type, desktop_media_path, mobile_media_path, video_poster_path, media_alt, show_text_overlay, heading, paragraph, show_button, button_label, button_link, overlay_position, overlay_scrim_enabled')
    .eq('section_key', sectionKey).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? { section_key: sectionKey, is_enabled: true, media_type: 'image', show_text_overlay: true, show_button: false, overlay_position: 'left', overlay_scrim_enabled: true })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const clean = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
  const { data, error } = await access.adminClient.from('about_hero').upsert({
    section_key: sectionKey,
    is_enabled: body.is_enabled === true,
    media_type: body.media_type === 'video' ? 'video' : 'image',
    desktop_media_path: clean(body.desktop_media_path), mobile_media_path: clean(body.mobile_media_path),
    video_poster_path: clean(body.video_poster_path), media_alt: clean(body.media_alt),
    show_text_overlay: body.show_text_overlay === true, heading: clean(body.heading), paragraph: clean(body.paragraph),
    show_button: body.show_button === true, button_label: clean(body.button_label), button_link: clean(body.button_link),
    overlay_position: positions.has(body.overlay_position) ? body.overlay_position : 'left',
    overlay_scrim_enabled: body.overlay_scrim_enabled === true, updated_at: new Date().toISOString(),
  }, { onConflict: 'section_key' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
