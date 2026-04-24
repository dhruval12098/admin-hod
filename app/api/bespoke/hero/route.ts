import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('bespoke_hero_content')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PUT(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body?.heading_line_1) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const existing = await access.adminClient
    .from('bespoke_hero_content')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const payload = {
    badge_text: body.badge_text ?? null,
    eyebrow: body.eyebrow ?? null,
    heading_line_1: body.heading_line_1,
    heading_line_2: body.heading_line_2 ?? null,
    subtitle: body.subtitle ?? null,
    primary_cta_label: body.primary_cta_label ?? null,
    primary_cta_action: body.primary_cta_action ?? null,
    secondary_cta_label: body.secondary_cta_label ?? null,
    secondary_cta_action: body.secondary_cta_action ?? null,
    status: body.status ?? 'active',
  }

  const query = existing.data?.id
    ? access.adminClient.from('bespoke_hero_content').update(payload).eq('id', existing.data.id)
    : access.adminClient.from('bespoke_hero_content').insert(payload)

  const { data, error } = await query.select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
