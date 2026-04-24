import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('bespoke_portfolio_items')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body?.title || !body?.tag || !body?.category_id) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('bespoke_portfolio_items')
    .insert({
      title: body.title,
      tag: body.tag,
      category_id: body.category_id,
      media_type: body.media_type ?? 'image',
      media_path: body.media_path ?? null,
      thumbnail_path: body.thumbnail_path ?? null,
      gem_style: body.gem_style ?? null,
      gem_color: body.gem_color ?? null,
      dark_theme: body.dark_theme ?? false,
      short_description: body.short_description ?? null,
      display_order: body.display_order ?? 0,
      status: body.status ?? 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
