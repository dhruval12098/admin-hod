import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { assertAdmin } from './cms-auth'
import { mapSectionTypeToDb, normalizeNavbarItemForSave, type NavbarItem } from './navbar'

type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>
const uuid = z.string().uuid()
const shortText = z.string().max(500)
const longText = z.string().max(2_000)
const integer = z.coerce.number().int().min(0).max(1_000_000)
const source = z.object({ id: z.string().regex(/^[1-9][0-9]*$/).optional(), sourceKind: z.enum(['subcategory_option', 'metal', 'stone_shape', 'ring_size', 'certificate', 'style']), sourceItemId: uuid, label: shortText, sortOrder: integer, isActive: z.boolean() }).strict()
const link = z.object({ id: uuid.optional(), label: shortText, url: longText }).strict()
const section = z.object({ id: z.string().min(1).max(200), title: shortText, iconSvgPath: longText.nullish(), type: z.enum(['Subcategory Options', 'Manual Links', 'Metal Swatches', 'Stone Shapes', 'Ring Sizes', 'Certificates', 'Styles', 'Category Link']), sourceLabel: shortText, sourceSubcategoryId: uuid.nullable(), sourceCategorySlug: shortText.nullish(), column: integer, showAsFilter: z.boolean().optional(), enableCategoryLink: z.boolean().optional(), linkedCategoryId: uuid.nullable().optional(), selectedSourceItems: z.array(source).max(1_000).optional(), links: z.array(link).max(500) }).strict()
const featured = z.object({ id: uuid.optional(), enabled: z.boolean(), imageUrl: longText, buttonLabel: shortText, buttonUrl: longText, imageAlt: longText }).strict()
const item = z.object({ id: z.string().min(1).max(200), label: shortText, slug: shortText, type: z.enum(['mega', 'direct']), linkedCategoryId: uuid.nullable().optional(), visible: z.boolean(), url: longText.optional(), columns: integer.optional(), sections: z.array(section).max(500).optional(), featuredImage: featured.optional() }).strict()
const envelope = z.object({
  request_id: uuid,
  expected_revision: z.string().regex(/^[a-f0-9]{32}$/),
  items: z.array(item).min(1).max(500),
  deleted_ids: z.object({ sections: z.array(uuid).max(1_000), links: z.array(uuid).max(2_000), source_items: z.array(z.string().regex(/^[1-9][0-9]*$/)).max(5_000), featured_cards: z.array(uuid).max(500) }).strict(),
}).strict()
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function unique(values: string[]) { return new Set(values).size === values.length }
function errorResponse(error: { code?: string; message?: string }) {
  if (error.code === 'PGRST202' || error.code === '42883') return NextResponse.json({ error: 'The navbar editor is awaiting its database update. Existing navigation was not changed.' }, { status: 503 })
  if (error.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
  if (['22023', '22P02', '23502', '23503', '23505', '23514'].includes(error.code ?? '')) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ error: 'Unable to save the navbar. No partial changes were committed.' }, { status: 500 })
}

export async function saveNavbar(access: Access, input: unknown) {
  const parsed = envelope.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid navbar save request.' }, { status: 400 })
  const deleted = parsed.data.deleted_ids
  if (![deleted.sections, deleted.links, deleted.source_items, deleted.featured_cards].every(unique)) return NextResponse.json({ error: 'Deleted navbar IDs must be unique.' }, { status: 400 })

  const normalized = parsed.data.items.map(normalizeNavbarItemForSave).filter((entry) => entry.label.trim())
  const itemKeys = new Set<string>()
  const sectionKeys = new Set<string>()
  const items: Record<string, unknown>[] = []
  const sections: Record<string, unknown>[] = []
  const links: Record<string, unknown>[] = []
  const sourceItems: Record<string, unknown>[] = []
  const featuredCards: Record<string, unknown>[] = []

  for (const [itemIndex, navItem] of normalized.entries()) {
    const itemKey = navItem.id
    if (itemKeys.has(itemKey)) return NextResponse.json({ error: 'Navbar item keys must be unique.' }, { status: 400 })
    itemKeys.add(itemKey)
    items.push({ key: itemKey, id: uuidPattern.test(navItem.id) ? navItem.id : null, label: navItem.label, slug: navItem.slug, item_type: navItem.type === 'mega' ? 'mega_menu' : 'direct_link', linked_category_id: navItem.type === 'mega' ? navItem.linkedCategoryId ?? null : null, direct_link_url: navItem.type === 'direct' ? navItem.url ?? '/' : null, display_order: itemIndex + 1, status: navItem.visible ? 'active' : 'hidden' })

    for (const [sectionIndex, navSection] of (navItem.type === 'mega' ? navItem.sections ?? [] : []).entries()) {
      const sectionKey = `${itemKey}:${navSection.id}`
      if (sectionKeys.has(sectionKey)) return NextResponse.json({ error: 'Navbar section keys must be unique.' }, { status: 400 })
      sectionKeys.add(sectionKey)
      const sectionType = mapSectionTypeToDb(navSection.type)
      sections.push({ key: sectionKey, id: uuidPattern.test(navSection.id) ? navSection.id : null, item_key: itemKey, title: navSection.title, icon_svg_path: navSection.iconSvgPath ?? null, section_type: sectionType, source_subcategory_id: sectionType === 'category_list' ? navSection.sourceSubcategoryId : null, source_category_slug: sectionType === 'category_link' ? navSection.sourceCategorySlug ?? null : null, enable_category_link: navSection.enableCategoryLink ?? false, linked_category_id: navSection.linkedCategoryId ?? null, column_number: Math.max(1, navSection.column), show_as_filter: navSection.showAsFilter ?? false, display_order: sectionIndex + 1, status: navItem.visible ? 'active' : 'hidden' })
      for (const [linkIndex, navLink] of navSection.links.entries()) links.push({ id: navLink.id ?? null, section_key: sectionKey, label: navLink.label, url: navLink.url, display_order: linkIndex + 1, status: navItem.visible ? 'active' : 'hidden' })
      for (const [sourceIndex, navSource] of (navSection.selectedSourceItems ?? []).entries()) sourceItems.push({ id: navSource.id ?? null, section_key: sectionKey, source_kind: navSource.sourceKind, source_item_id: navSource.sourceItemId, sort_order: navSource.sortOrder || sourceIndex + 1, is_active: navSource.isActive })
    }
    if (navItem.type === 'mega') {
      const card = navItem.featuredImage ?? { enabled: false, imageUrl: '', buttonLabel: '', buttonUrl: '', imageAlt: navItem.label }
      featuredCards.push({ id: card.id ?? null, item_key: itemKey, image_path: card.imageUrl || null, image_alt: card.imageAlt || navItem.label, button_label: card.buttonLabel || null, button_url: card.buttonUrl || null, enabled: card.enabled })
    }
  }

  const { data, error } = await access.adminClient.rpc('navbar_save_v1', { p_actor_id: access.user.id, p_request_id: parsed.data.request_id, p_expected_revision: parsed.data.expected_revision, p_items: items, p_sections: sections, p_links: links, p_source_items: sourceItems, p_featured_cards: featuredCards, p_deleted_section_ids: deleted.sections, p_deleted_link_ids: deleted.links, p_deleted_source_item_ids: deleted.source_items.map(Number), p_deleted_featured_card_ids: deleted.featured_cards })
  if (error) return errorResponse(error)
  return NextResponse.json({ ok: true, revision: (data as { revision?: string } | null)?.revision }, { headers: { 'Cache-Control': 'no-store' } })
}
