import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { invalidateProductListReferenceData } from '@/lib/product-list-reference-cache'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if ('category_id' in body) updates.category_id = body.category_id
  if ('name' in body) updates.name = body.name
  if ('slug' in body) updates.slug = body.slug
  if ('sub_type' in body) updates.sub_type = body.sub_type ?? 'standard'
  if ('icon_svg_path' in body) updates.icon_svg_path = body.icon_svg_path ?? null
  if ('display_order' in body) updates.display_order = body.display_order ?? 0
  if ('status' in body) updates.status = body.status ?? 'active'

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_subcategories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateProductListReferenceData()
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const { error } = await access.adminClient.from('catalog_subcategories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateProductListReferenceData()
  return NextResponse.json({ ok: true })
}
