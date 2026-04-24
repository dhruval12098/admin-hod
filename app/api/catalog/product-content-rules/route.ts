import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body?.name || !body?.slug || !body?.title || !body?.body || !body?.kind) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('product_content_rules')
    .insert({
      kind: body.kind,
      name: body.name,
      slug: body.slug,
      title: body.title,
      body: body.body,
      display_order: body.display_order ?? 0,
      status: body.status ?? 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
