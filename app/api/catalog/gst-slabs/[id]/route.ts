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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = (await request.json().catch(() => null)) as GstPayload | null
  if (!body?.name?.trim() || !body?.code?.trim()) {
    return NextResponse.json({ error: 'Name and code are required.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_gst_slabs')
    .update({
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      percentage: Number(body.percentage ?? 0),
      description: body.description?.trim() || null,
      status: body.status || 'active',
      display_order: Number(body.display_order ?? 0),
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
  const { error } = await access.adminClient.from('catalog_gst_slabs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
