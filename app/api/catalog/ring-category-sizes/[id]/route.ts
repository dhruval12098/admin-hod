import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type RingCategorySizePayload = {
  ring_category_id: string
  size_label: string
  size_value?: string | null
  display_order?: number
  status?: string
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = (await request.json().catch(() => null)) as RingCategorySizePayload | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const { data, error } = await access.adminClient
    .from('catalog_ring_category_sizes')
    .update({
      ring_category_id: body.ring_category_id,
      size_label: body.size_label?.trim(),
      size_value: body.size_value?.trim() || null,
      display_order: Number(body.display_order ?? 0),
      status: body.status || 'active',
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
  const { error } = await access.adminClient.from('catalog_ring_category_sizes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
