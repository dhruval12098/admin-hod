import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type MaterialValuePayload = {
  name: string
  slug: string
  cta_mode?: string
  cta_label?: string | null
  display_order?: number
  status?: string
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = (await request.json().catch(() => null)) as MaterialValuePayload | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const { data, error } = await access.adminClient
    .from('catalog_material_values')
    .update({
      name: body.name?.trim(),
      slug: body.slug?.trim(),
      cta_mode: body.cta_mode || 'both',
      cta_label: body.cta_label?.trim() || null,
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
  const { error } = await access.adminClient.from('catalog_material_values').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
