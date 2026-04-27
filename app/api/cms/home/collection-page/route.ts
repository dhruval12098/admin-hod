import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('collection_page_config')
    .select('*')
    .eq('section_key', 'main_collection_page')
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
    section_key: 'main_collection_page',
    page_enabled: body.page_enabled ?? false,
    show_in_footer: body.show_in_footer ?? false,
    show_home_showcase: body.show_home_showcase ?? false,
    showcase_heading: body.showcase_heading ?? '',
    showcase_subtitle: body.showcase_subtitle ?? '',
    showcase_cta_label: body.showcase_cta_label ?? '',
    showcase_cta_href: body.showcase_cta_href ?? '/collection',
    showcase_image_path: body.showcase_image_path ?? null,
    showcase_mobile_image_path: body.showcase_mobile_image_path ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await access.adminClient
    .from('collection_page_config')
    .upsert(payload, { onConflict: 'section_key' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
