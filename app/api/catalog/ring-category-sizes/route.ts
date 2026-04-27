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

  const { data, error } = await access.adminClient
    .from('catalog_ring_category_sizes')
    .insert({
      ring_category_id: body.ring_category_id,
      size_label: body.size_label.trim(),
      size_value: body.size_value?.trim() || null,
      display_order: Number(body.display_order ?? 0),
      status: body.status || 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
