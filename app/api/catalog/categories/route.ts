import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body?.name || !body?.slug || !body?.code) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_categories')
    .insert({
      code: body.code,
      name: body.name,
      slug: body.slug,
      show_in_nav: body.show_in_nav ?? true,
      nav_type: body.show_in_nav === false ? null : body.nav_type ?? null,
      direct_link_url: body.direct_link_url ?? null,
      display_order: body.display_order ?? 0,
      status: body.status ?? 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
