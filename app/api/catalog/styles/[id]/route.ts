import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body?.name) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_styles')
    .update({
      name: body.name,
      icon_svg_path: body.icon_svg_path ?? null,
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
  const { error } = await access.adminClient.from('catalog_styles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
