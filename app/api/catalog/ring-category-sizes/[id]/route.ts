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

  const sizeLabel = body.size_label?.trim()
  const sizeValue = body.size_value?.trim() || null

  if (!body.ring_category_id || !sizeLabel) {
    return NextResponse.json({ error: 'Ring category and size label are required.' }, { status: 400 })
  }

  const { data: existingRows, error: duplicateLookupError } = await access.adminClient
    .from('catalog_ring_category_sizes')
    .select('id, size_label, size_value')
    .eq('ring_category_id', body.ring_category_id)
    .eq('size_label', sizeLabel)

  if (duplicateLookupError) {
    return NextResponse.json({ error: duplicateLookupError.message }, { status: 500 })
  }

  const duplicateRow = (existingRows ?? []).find((entry) => entry.id !== id)
  if (duplicateRow) {
    return NextResponse.json(
      { error: `A size with label "${sizeLabel}" already exists in this ring category.` },
      { status: 409 }
    )
  }

  const { data, error } = await access.adminClient
    .from('catalog_ring_category_sizes')
    .update({
      ring_category_id: body.ring_category_id,
      size_label: sizeLabel,
      size_value: sizeValue,
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
