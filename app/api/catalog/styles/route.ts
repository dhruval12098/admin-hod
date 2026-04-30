import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('catalog_styles')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body?.name) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_styles')
    .insert({
      name: body.name,
      icon_svg_path: body.icon_svg_path ?? null,
      display_order: body.display_order ?? 0,
      status: body.status ?? 'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
