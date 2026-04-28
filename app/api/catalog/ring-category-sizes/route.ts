import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type RingCategorySizePayload = {
  ring_category_id: string
  size_label: string
  size_value?: string | null
  display_order?: number
  status?: string
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('catalog_ring_category_sizes')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as RingCategorySizePayload | null
  if (!body?.ring_category_id || !body?.size_label?.trim()) {
    return NextResponse.json({ error: 'Ring category and size label are required.' }, { status: 400 })
  }

  const sizeLabel = body.size_label.trim()
  const sizeValue = body.size_value?.trim() || null

  const { data: existingDuplicate, error: duplicateLookupError } = await access.adminClient
    .from('catalog_ring_category_sizes')
    .select('id, size_label, size_value')
    .eq('ring_category_id', body.ring_category_id)
    .eq('size_label', sizeLabel)
    .maybeSingle()

  if (duplicateLookupError) {
    return NextResponse.json({ error: duplicateLookupError.message }, { status: 500 })
  }

  if (existingDuplicate) {
    return NextResponse.json(
      { error: `A size with label "${sizeLabel}" already exists in this ring category.` },
      { status: 409 }
    )
  }

  const { data, error } = await access.adminClient
    .from('catalog_ring_category_sizes')
    .insert({
      ring_category_id: body.ring_category_id,
      size_label: sizeLabel,
      size_value: sizeValue,
      display_order: Number(body.display_order ?? 0),
      status: body.status || 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
