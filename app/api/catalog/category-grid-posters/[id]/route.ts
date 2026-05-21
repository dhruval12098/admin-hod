import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body?.category_id || !body?.image_path) {
    return NextResponse.json({ error: 'Category and poster image are required.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('category_grid_posters')
    .update({
      category_id: body.category_id,
      title: body.title || null,
      image_path: body.image_path,
      image_alt: body.image_alt || null,
      link_url: body.link_url || null,
      insert_after: Number(body.insert_after) >= 0 ? Number(body.insert_after) : 6,
      display_order: Number(body.display_order) || 0,
      status: body.status ?? 'active',
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
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
  const { error } = await access.adminClient.from('category_grid_posters').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
