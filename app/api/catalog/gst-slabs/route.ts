import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type GstPayload = {
  name: string
  code: string
  percentage: number
  description?: string | null
  status?: string
  display_order?: number
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('catalog_gst_slabs')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as GstPayload | null
  if (!body?.name?.trim() || !body?.code?.trim()) {
    return NextResponse.json({ error: 'Name and code are required.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_gst_slabs')
    .insert({
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      percentage: Number(body.percentage ?? 0),
      description: body.description?.trim() || null,
      status: body.status || 'active',
      display_order: Number(body.display_order ?? 0),
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
