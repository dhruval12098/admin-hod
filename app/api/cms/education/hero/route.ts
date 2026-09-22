import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const fields = 'id, is_enabled, heading, paragraph, button_label, button_link, desktop_image_path, desktop_image_alt, mobile_image_path, mobile_image_alt'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.from('education_page_hero').select(fields).eq('id', 1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data ?? null })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const heading = String(body.heading ?? '').trim()
  if (!heading) return NextResponse.json({ error: 'Heading is required.' }, { status: 400 })
  const payload = {
    id: 1,
    is_enabled: body.is_enabled !== false,
    heading,
    paragraph: String(body.paragraph ?? '').trim() || null,
    button_label: String(body.button_label ?? '').trim() || null,
    button_link: String(body.button_link ?? '').trim() || null,
    desktop_image_path: String(body.desktop_image_path ?? '').trim() || null,
    desktop_image_alt: String(body.desktop_image_alt ?? '').trim() || null,
    mobile_image_path: String(body.mobile_image_path ?? '').trim() || null,
    mobile_image_alt: String(body.mobile_image_alt ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await access.adminClient.from('education_page_hero').upsert(payload, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
