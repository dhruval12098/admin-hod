import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.from('about_values').select('id, sort_order, icon_path, image_path, image_alt, title, description').order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items)) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const { error: deleteError } = await access.adminClient.from('about_values').delete().gte('sort_order', 0)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  const rows = body.items.filter((item: any) => typeof item.title === 'string' && typeof item.description === 'string').map((item: any, index: number) => ({
    sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
    icon_path: typeof item.icon_path === 'string' ? item.icon_path : '',
    image_path: typeof item.image_path === 'string' && item.image_path.trim() ? item.image_path.trim() : null,
    image_alt: typeof item.image_alt === 'string' && item.image_alt.trim() ? item.image_alt.trim() : null,
    title: item.title, description: item.description,
  }))
  if (rows.length) {
    const { error } = await access.adminClient.from('about_values').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
