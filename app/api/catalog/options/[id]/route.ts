import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if ('subcategory_id' in body) updates.subcategory_id = body.subcategory_id
  if ('name' in body) updates.name = body.name
  if ('slug' in body) updates.slug = body.slug
  if ('icon_svg_path' in body) updates.icon_svg_path = body.icon_svg_path ?? null
  if ('display_order' in body) updates.display_order = body.display_order ?? 0
  if ('status' in body) updates.status = body.status ?? 'active'

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_options')
    .update(updates)
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
  const { error } = await access.adminClient.from('catalog_options').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
