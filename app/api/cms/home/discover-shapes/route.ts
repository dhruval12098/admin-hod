import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type DiscoverItem = {
  sort_order: number
  title: string
  description: string
  image_path: string
  image_alt?: string
  shape_id?: string
}

const tableName = 'discover_shapes_items'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from(tableName)
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const items = body.items.filter((item: DiscoverItem) => {
    return (
      typeof item.sort_order === 'number' &&
      typeof item.title === 'string' &&
      typeof item.description === 'string' &&
      typeof item.image_path === 'string' &&
      (typeof item.shape_id === 'undefined' || typeof item.shape_id === 'string')
    )
  }) as DiscoverItem[]

  const { error: deleteError } = await access.adminClient.from(tableName).delete().gte('sort_order', 0)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (items.length > 0) {
    const rows = items.map((item) => ({
      sort_order: item.sort_order,
      title: item.title,
      description: item.description,
      image_path: item.image_path,
      image_alt: item.image_alt || item.title,
      shape_id: item.shape_id || null,
      status: 'active',
    }))

    const { error: insertError } = await access.adminClient.from(tableName).insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
