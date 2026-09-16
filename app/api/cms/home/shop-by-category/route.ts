import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionKey = 'home_shop_by_category'
type Kind = 'category' | 'subcategory' | 'option'
type ItemInput = { item_type: Kind; category_id: string | null; subcategory_id: string | null; option_id: string | null; display_order: number; is_active: boolean }

function validateItem(value: unknown): value is ItemInput {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ItemInput>
  if (!['category', 'subcategory', 'option'].includes(item.item_type ?? '')) return false
  const ids = [item.category_id, item.subcategory_id, item.option_id].filter((id) => typeof id === 'string' && id.length > 0)
  if (ids.length !== 1 || typeof item.is_active !== 'boolean') return false
  return (item.item_type === 'category' && !!item.category_id) || (item.item_type === 'subcategory' && !!item.subcategory_id) || (item.item_type === 'option' && !!item.option_id)
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  const section = body?.section
  const items: unknown[] = body?.items
  if (!section || typeof section.heading !== 'string' || typeof section.is_enabled !== 'boolean' || !Array.isArray(items) || !items.every(validateItem)) return NextResponse.json({ error: 'Invalid section payload.' }, { status: 400 })
  const columns = { desktop_columns: Number(section.desktop_columns), tablet_columns: Number(section.tablet_columns), mobile_columns: Number(section.mobile_columns) }
  if (columns.desktop_columns < 2 || columns.desktop_columns > 8 || columns.tablet_columns < 1 || columns.tablet_columns > 6 || columns.mobile_columns < 1 || columns.mobile_columns > 3) return NextResponse.json({ error: 'Column counts are outside the allowed range.' }, { status: 400 })
  const normalized = (items as ItemInput[]).map((item, index) => ({ ...item, display_order: index }))
  const keys = normalized.map((item) => `${item.item_type}:${item.category_id ?? item.subcategory_id ?? item.option_id}`)
  if (new Set(keys).size !== keys.length) return NextResponse.json({ error: 'The same catalog item cannot be selected twice.' }, { status: 409 })

  const db = access.adminClient
  const idsByKind = (kind: Kind) => normalized.filter((x) => x.item_type === kind).map((x) => (kind === 'category' ? x.category_id : kind === 'subcategory' ? x.subcategory_id : x.option_id) as string)
  const [categories, subcategories, options] = await Promise.all([
    idsByKind('category').length ? db.from('catalog_categories').select('id, name, status').in('id', idsByKind('category')) : Promise.resolve({ data: [], error: null }),
    idsByKind('subcategory').length ? db.from('catalog_subcategories').select('id, name, status').in('id', idsByKind('subcategory')) : Promise.resolve({ data: [], error: null }),
    idsByKind('option').length ? db.from('catalog_options').select('id, name, status').in('id', idsByKind('option')) : Promise.resolve({ data: [], error: null }),
  ])
  if (categories.error || subcategories.error || options.error) return NextResponse.json({ error: categories.error?.message ?? subcategories.error?.message ?? options.error?.message }, { status: 500 })
  const catalogRows = [...(categories.data ?? []), ...(subcategories.data ?? []), ...(options.data ?? [])]
  const found = new Set(catalogRows.map((x) => x.id))
  const missing = normalized.filter((item) => !found.has(item.category_id ?? item.subcategory_id ?? item.option_id ?? ''))
  const inactive = catalogRows.filter((item) => item.status !== 'active')
  if (missing.length) return NextResponse.json({ error: 'One or more selected catalog records no longer exist. Refresh the editor and try again.' }, { status: 400 })
  if (inactive.length) return NextResponse.json({ error: `Remove inactive catalog items before saving: ${inactive.map((item) => item.name).join(', ')}.` }, { status: 400 })

  const settings = { section_key: sectionKey, heading: section.heading.trim() || 'Shop By Category', shop_all_label: String(section.shop_all_label ?? '').trim() || null, shop_all_link: String(section.shop_all_link ?? '').trim() || null, is_enabled: section.is_enabled, ...columns }
  const { data: currentSection, error: currentSectionError } = await db.from('homepage_shop_by_category').select('id, heading, shop_all_label, shop_all_link, is_enabled, desktop_columns, tablet_columns, mobile_columns').eq('section_key', sectionKey).maybeSingle()
  if (currentSectionError) return NextResponse.json({ error: currentSectionError.message }, { status: 500 })

  let sectionId = currentSection?.id as number | undefined
  let createdSection = false
  if (!sectionId) {
    const created = await db.from('homepage_shop_by_category').insert({ ...settings, is_enabled: false }).select('id').single()
    if (created.error || !created.data) return NextResponse.json({ error: created.error?.message ?? 'Unable to create section.' }, { status: 500 })
    sectionId = created.data.id
    createdSection = true
  }

  const { data: existing, error: existingError } = await db.from('homepage_shop_by_category_items').select('id, item_type, category_id, subcategory_id, option_id, display_order, is_active').eq('section_id', sectionId)
  if (existingError) {
    if (createdSection) await db.from('homepage_shop_by_category').delete().eq('id', sectionId)
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }
  const keyOf = (item: { item_type: string; category_id: string | null; subcategory_id: string | null; option_id: string | null }) => `${item.item_type}:${item.category_id ?? item.subcategory_id ?? item.option_id}`
  const existingByKey = new Map((existing ?? []).map((item) => [keyOf(item), item]))
  const desiredKeys = new Set(normalized.map(keyOf))
  const added = normalized.filter((item) => !existingByKey.has(keyOf(item)))
  const retained = normalized.filter((item) => existingByKey.has(keyOf(item))).map((item) => ({ ...item, id: existingByKey.get(keyOf(item))!.id, section_id: sectionId }))
  const removedIds = (existing ?? []).filter((item) => !desiredKeys.has(keyOf(item))).map((item) => item.id)
  let insertedIds: number[] = []

  const rollback = async () => {
    if (insertedIds.length) await db.from('homepage_shop_by_category_items').delete().in('id', insertedIds)
    if (existing?.length) await db.from('homepage_shop_by_category_items').upsert(existing.map((item) => ({ ...item, section_id: sectionId })), { onConflict: 'id' })
    if (currentSection) await db.from('homepage_shop_by_category').update(currentSection).eq('id', sectionId)
    if (createdSection) await db.from('homepage_shop_by_category').delete().eq('id', sectionId)
  }

  if (added.length) {
    const inserted = await db.from('homepage_shop_by_category_items').insert(added.map((item) => ({ ...item, section_id: sectionId }))).select('id')
    if (inserted.error) { if (createdSection) await rollback(); return NextResponse.json({ error: inserted.error.code === '23505' ? 'A selected item is duplicated.' : inserted.error.message }, { status: inserted.error.code === '23505' ? 409 : 500 }) }
    insertedIds = (inserted.data ?? []).map((item) => item.id)
  }
  if (retained.length) {
    const updated = await db.from('homepage_shop_by_category_items').upsert(retained, { onConflict: 'id' })
    if (updated.error) { await rollback(); return NextResponse.json({ error: updated.error.message }, { status: 500 }) }
  }
  const settingsResult = await db.from('homepage_shop_by_category').update(settings).eq('id', sectionId)
  if (settingsResult.error) { await rollback(); return NextResponse.json({ error: settingsResult.error.message }, { status: 500 }) }
  if (removedIds.length) {
    const removed = await db.from('homepage_shop_by_category_items').delete().in('id', removedIds)
    if (removed.error) { await rollback(); return NextResponse.json({ error: removed.error.message }, { status: 500 }) }
  }
  return NextResponse.json({ ok: true })
}
