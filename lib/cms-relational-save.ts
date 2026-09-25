import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { assertAdmin } from './cms-auth'

export type CmsRelationalKind = 'checkout_result' | 'promotion' | 'service_banner' | 'summary' | 'announcement' | 'faq'
type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> }
const text = (max = 10_000) => z.string().max(max)
const required = (max = 10_000) => z.string().trim().min(1).max(max)
const integer = z.coerce.number().int().min(0).max(1_000_000)
const numericId = z.union([z.number().int().positive(), z.string().regex(/^[1-9][0-9]*$/)]).transform(String)
const uuid = z.string().uuid()
const httpUrl = z.string().max(2_000).refine((value) => !value || /^https?:\/\//i.test(value), 'Use a valid HTTP(S) URL.')

const schemas: Record<CmsRelationalKind, { parent: z.ZodTypeAny; item: z.ZodTypeAny }> = {
  checkout_result: {
    parent: z.object({ main_banner_image_path: text(2_000), main_banner_image_alt: text(2_000), secondary_banner_image_path: text(2_000), secondary_banner_image_alt: text(2_000), secondary_eyebrow: text(500), secondary_heading: text(500), secondary_paragraph: text(10_000), is_enabled: z.boolean() }).strict(),
    item: z.object({ state: z.enum(['success', 'pending', 'failed', 'error']), eyebrow: text(500), heading: text(500), paragraph: text(10_000), order_button_label: text(500), is_enabled: z.boolean() }).strict(),
  },
  promotion: {
    parent: z.object({ label: text(500), title: text(500), description: text(10_000), cta_text: text(500), cta_link: text(2_000), cta_action: z.enum(['redirect', 'reveal_coupon']), selected_coupon_id: z.number().int().positive().nullable(), image_path: text(2_000), mobile_image_path: text(2_000), image_alt: text(2_000), image_only_mode: z.boolean(), is_active: z.boolean(), show_once_per_session: z.boolean() }).strict(),
    item: z.object({ id: numericId.nullable().optional(), field_key: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/), question: required(2_000), input_type: z.enum(['text', 'email', 'phone', 'number', 'options']), options: z.array(z.object({ id: z.string(), label: required(500), value: required(500) }).strict()).max(100), allow_multiple: z.boolean(), validation_pattern: text(2_000), validation_message: text(2_000), is_required: z.boolean(), is_active: z.boolean(), sort_order: integer }).strict(),
  },
  service_banner: {
    parent: z.object({ image_path: text(2_000), image_alt: text(2_000), is_enabled: z.boolean() }).strict(),
    item: z.object({ id: uuid.optional(), title: required(500), paragraph: required(10_000), sort_order: integer, is_active: z.boolean() }).strict(),
  },
  summary: {
    parent: z.object({ heading: required(200), is_enabled: z.boolean() }).strict(),
    item: z.object({ id: uuid.optional(), sort_order: integer, icon_url: httpUrl, pointer_text: required(500), video_url: httpUrl, video_link_text: text(150) }).strict().refine((x) => !x.video_link_text.trim() || Boolean(x.video_url), 'Video link text requires a video URL.'),
  },
  announcement: {
    parent: z.object({ is_active: z.boolean(), autoplay: z.boolean(), speed_ms: z.coerce.number().int().min(100).max(120_000) }).strict(),
    item: z.object({ id: numericId.optional(), message: required(2_000), link_url: text(2_000), open_in_new_tab: z.boolean(), sort_order: integer, is_active: z.boolean() }).strict(),
  },
  faq: {
    parent: z.object({ title: required(500), subtitle: text(2_000) }).strict(),
    item: z.object({ id: numericId.optional(), question: required(2_000), answer: required(50_000), sort_order: integer, is_active: z.boolean(), category_id: z.union([z.number().int().positive(), z.null()]), catalog_category_id: z.union([uuid, z.null()]) }).strict(),
  },
}

const envelope = z.object({ request_id: uuid, expected_revision: z.string().regex(/^[a-f0-9]{32}$/), deleted_ids: z.array(z.string().min(1)).max(500), parent: z.record(z.string(), z.unknown()), items: z.array(z.record(z.string(), z.unknown())).max(500) }).strict()
export type CmsRelationalSnapshot = { parent: Record<string, unknown> | null; items: Array<Record<string, unknown>>; revision: string }

export async function loadCmsRelationalSnapshot(client: RpcClient, kind: CmsRelationalKind) {
  const { data, error } = await client.rpc('cms_relational_snapshot_v1', { p_kind: kind })
  if (error) throw new Error(error.code === 'PGRST202' || error.code === '42883' ? 'This CMS section is awaiting its database migration.' : 'Unable to load this CMS section.')
  return data as CmsRelationalSnapshot
}

function errorResponse(error: { code?: string; message?: string }) {
  if (error.code === 'PGRST202' || error.code === '42883') return NextResponse.json({ error: 'This CMS section is awaiting its database update. Existing content was not changed.' }, { status: 503 })
  if (error.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
  if (['22023', '22P02', '23502', '23503', '23505', '23514'].includes(error.code ?? '')) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ error: 'Unable to save this section. No partial changes were committed.' }, { status: 500 })
}

export async function saveCmsRelational(access: Access, kind: CmsRelationalKind, input: unknown) {
  const parsed = envelope.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid save payload.' }, { status: 400 })
  const parent = schemas[kind].parent.safeParse(parsed.data.parent)
  if (!parent.success) return NextResponse.json({ error: parent.error.issues[0]?.message ?? 'Invalid section details.' }, { status: 400 })
  const items = z.array(schemas[kind].item).safeParse(parsed.data.items)
  if (!items.success) return NextResponse.json({ error: items.error.issues[0]?.message ?? 'Invalid section item.' }, { status: 400 })
  const ids = items.data.flatMap((item: { id?: unknown }) => item.id == null ? [] : [String(item.id)])
  if (new Set(ids).size !== ids.length || new Set(parsed.data.deleted_ids).size !== parsed.data.deleted_ids.length || ids.some((id) => parsed.data.deleted_ids.includes(id))) return NextResponse.json({ error: 'Item IDs must be unique and cannot also be deleted.' }, { status: 400 })
  if (kind === 'checkout_result' && (items.data.length !== 4 || new Set(items.data.map((item: { state: string }) => item.state)).size !== 4)) return NextResponse.json({ error: 'All four checkout states are required.' }, { status: 400 })
  if (kind === 'promotion') {
    const promotion = parent.data as { cta_action: string; cta_link: string; selected_coupon_id: number | null }
    if (promotion.cta_action === 'redirect' && !promotion.cta_link.trim()) return NextResponse.json({ error: 'A destination link is required for Redirect mode.' }, { status: 400 })
    if (promotion.cta_action === 'reveal_coupon') {
      if (!promotion.selected_coupon_id) return NextResponse.json({ error: 'Select an active coupon for Reveal coupon mode.' }, { status: 400 })
      const { data: coupon } = await access.adminClient.from('coupons').select('id,usage_limit,usage_count').eq('id', promotion.selected_coupon_id).eq('is_active', true).maybeSingle()
      if (!coupon || (coupon.usage_limit != null && Number(coupon.usage_count ?? 0) >= Number(coupon.usage_limit))) return NextResponse.json({ error: 'The selected coupon is unavailable or has reached its usage limit.' }, { status: 400 })
    }
  }
  const { data, error } = await access.adminClient.rpc('cms_save_relational_v1', { p_actor_id: access.user.id, p_request_id: parsed.data.request_id, p_expected_revision: parsed.data.expected_revision, p_kind: kind, p_parent: parent.data, p_items: items.data, p_deleted_ids: parsed.data.deleted_ids })
  if (error) return errorResponse(error)
  return NextResponse.json({ ok: true, ...(data as object) }, { headers: { 'Cache-Control': 'no-store' } })
}
