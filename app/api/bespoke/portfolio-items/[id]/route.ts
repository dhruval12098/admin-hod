import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const { data, error } = await access.adminClient
    .from('bespoke_portfolio_items')
    .update({
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
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const { error } = await access.adminClient.from('bespoke_portfolio_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
