import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body?.subcategory_id || !body?.name || !body?.slug) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_options')
    .insert({
      subcategory_id: body.subcategory_id,
      name: body.name,
      slug: body.slug,
      display_order: body.display_order ?? 0,
      status: body.status ?? 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

