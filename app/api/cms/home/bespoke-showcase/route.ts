import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('home_bespoke_showcase_section')
    .select('*')
    .eq('section_key', 'home_bespoke_showcase')
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
    section_key: 'home_bespoke_showcase',
    is_enabled: body.is_enabled ?? false,
    eyebrow: body.eyebrow ?? '',
    heading: body.heading ?? '',
    subtitle: body.subtitle ?? '',
    cta_label: body.cta_label ?? '',
    image_path: body.image_path ?? null,
    mobile_image_path: body.mobile_image_path ?? null,
    image_alt: body.image_alt ?? '',
    sort_order: body.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await access.adminClient
    .from('home_bespoke_showcase_section')
    .upsert(payload, { onConflict: 'section_key' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
