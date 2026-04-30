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

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('catalog_material_values')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as MaterialValuePayload | null
  if (!body?.name?.trim() || !body?.slug?.trim()) {
    return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_material_values')
    .insert({
      name: body.name.trim(),
      slug: body.slug.trim(),
      cta_mode: body.cta_mode || 'both',
      cta_label: body.cta_label?.trim() || null,
      display_order: Number(body.display_order ?? 0),
      status: body.status || 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
