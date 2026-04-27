import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('promotion_popup')
    .select('*')
    .eq('section_key', 'global_promotion_popup')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const payload = {
    section_key: 'global_promotion_popup',
    label: typeof body.label === 'string' ? body.label : '',
    title: typeof body.title === 'string' ? body.title : '',
    description: typeof body.description === 'string' ? body.description : '',
    cta_text: typeof body.cta_text === 'string' ? body.cta_text : '',
    cta_link: typeof body.cta_link === 'string' ? body.cta_link : '',
    image_path: typeof body.image_path === 'string' ? body.image_path : '',
    image_alt: typeof body.image_alt === 'string' ? body.image_alt : '',
    image_only_mode: Boolean(body.image_only_mode),
    is_active: Boolean(body.is_active),
    show_once_per_session: body.show_once_per_session !== false,
  }

  const { error } = await access.adminClient
    .from('promotion_popup')
    .upsert(payload, { onConflict: 'section_key' })

  if (error && error.message.toLowerCase().includes('image_only_mode')) {
    const fallbackPayload = {
      section_key: payload.section_key,
      label: payload.label,
      title: payload.title,
      description: payload.description,
      cta_text: payload.cta_text,
      cta_link: payload.cta_link,
      image_path: payload.image_path,
      image_alt: payload.image_alt,
      is_active: payload.is_active,
      show_once_per_session: payload.show_once_per_session,
    }

    const fallback = await access.adminClient
      .from('promotion_popup')
      .upsert(fallbackPayload, { onConflict: 'section_key' })

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, fallback: true })
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
