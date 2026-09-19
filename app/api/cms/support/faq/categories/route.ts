import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const fields = 'id, name, slug, description, image_path, image_alt, sort_order, is_active'
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !body.name.trim()) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })
  const id = Number(body.id)
  const row = {
    name: body.name.trim(), slug: slugify(String(body.slug || body.name)), description: String(body.description || '').trim(),
    image_path: String(body.image_path || '').trim() || null, image_alt: String(body.image_alt || body.name).trim(),
    sort_order: Number(body.sort_order) || 1, is_active: body.is_active !== false, updated_at: new Date().toISOString(),
  }
  const { data, error } = Number.isSafeInteger(id) && id > 0
    ? await access.adminClient.from('support_faq_categories').update(row).eq('id', id).select(fields).single()
    : await access.adminClient.from('support_faq_categories').insert(row).select(fields).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ category: data })
}

export async function DELETE(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
  const [{ count: itemCount }, { count: pageCount }] = await Promise.all([
    access.adminClient.from('support_faq_items').select('id', { count: 'exact', head: true }).eq('category_id', id),
    access.adminClient.from('docs_pages').select('id', { count: 'exact', head: true }).eq('faq_category_id', id),
  ])
  if ((itemCount || 0) > 0 || (pageCount || 0) > 0) return NextResponse.json({ error: 'Remove this category from its FAQs and document page before deleting it.' }, { status: 409 })
  const { error } = await access.adminClient.from('support_faq_categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}