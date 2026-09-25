import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { assertAdmin } from './cms-auth'

export type CmsSingletonKind = 'about_hero' | 'about_wide_banner' | 'blog_hero' | 'education_hero' | 'contact_hero' | 'bespoke_showcase' | 'collection_page' | 'hiphop_showcase'
type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> }

const text = (max = 10_000) => z.string().max(max)
const requiredText = (max = 10_000) => z.string().trim().min(1).max(max)
const imageHero = z.object({
  is_enabled: z.boolean(), heading: requiredText(500), paragraph: text(10_000), button_label: text(500), button_link: text(2_000),
  desktop_image_path: text(2_000), desktop_image_alt: text(2_000), mobile_image_path: text(2_000), mobile_image_alt: text(2_000),
}).strict()

export const cmsSingletonItemSchemas = {
  about_hero: z.object({
    section_key: z.string().optional(), is_enabled: z.boolean(), media_type: z.enum(['image', 'video']), desktop_media_path: text(2_000),
    mobile_media_path: text(2_000), video_poster_path: text(2_000), media_alt: text(2_000), show_text_overlay: z.boolean(),
    heading: text(500), paragraph: text(10_000), show_button: z.boolean(), button_label: text(500), button_link: text(2_000),
    overlay_position: z.enum(['left', 'center', 'right', 'bottom-left', 'bottom-center', 'bottom-right']), overlay_scrim_enabled: z.boolean(),
  }).strict(),
  about_wide_banner: z.object({
    section_key: z.string().optional(), is_enabled: z.boolean(), desktop_image_path: text(2_000), mobile_image_path: text(2_000),
    image_alt: text(2_000), heading: text(500), paragraph: text(10_000), show_button: z.boolean(), button_label: text(500),
    button_link: text(2_000), content_position: z.enum(['left', 'center', 'right', 'bottom-left', 'bottom-center', 'bottom-right']),
    sort_order: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  }).strict(),
  blog_hero: imageHero,
  education_hero: imageHero,
  contact_hero: z.object({ section_key: z.string().optional(), eyebrow: requiredText(500), heading: requiredText(500), subtitle: requiredText(10_000) }).strict(),
  bespoke_showcase: z.object({
    is_enabled: z.boolean(), eyebrow: text(500), heading: requiredText(500), subtitle: text(10_000), cta_label: text(500),
    image_path: text(2_000), mobile_image_path: text(2_000), image_alt: text(2_000), sort_order: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  }).strict(),
  collection_page: z.object({
    page_enabled: z.boolean(), show_in_footer: z.boolean(), show_home_showcase: z.boolean(), showcase_heading: text(500),
    showcase_subtitle: text(10_000), showcase_cta_label: text(500), showcase_cta_href: text(2_000), showcase_image_path: text(2_000),
    showcase_mobile_image_path: text(2_000),
  }).strict(),
  hiphop_showcase: z.object({
    is_enabled: z.boolean(), eyebrow: text(500), heading_line_1: requiredText(500), heading_line_2: text(500), heading_emphasis: text(500),
    cta_label: text(500), cta_link: text(2_000), image_path: text(2_000), image_alt: text(2_000),
  }).strict(),
} satisfies Record<CmsSingletonKind, z.ZodTypeAny>

const envelopeSchema = z.object({
  request_id: z.string().uuid(),
  expected_revision: z.string().regex(/^[a-f0-9]{32}$/),
  item: z.record(z.string(), z.unknown()),
}).strict()

export type CmsSingletonSnapshot<T extends Record<string, unknown> = Record<string, unknown>> = { item: T | null; revision: string }

export async function loadCmsSingletonSnapshot<T extends Record<string, unknown>>(client: RpcClient, kind: CmsSingletonKind) {
  const { data, error } = await client.rpc('cms_singleton_snapshot_v1', { p_kind: kind })
  if (error) throw new Error(error.code === 'PGRST202' || error.code === '42883'
    ? 'This CMS section is awaiting its database migration.' : 'Unable to load this CMS section.')
  return data as CmsSingletonSnapshot<T>
}

function singletonError(error: { code?: string; message?: string }) {
  if (error.code === 'PGRST202' || error.code === '42883') return NextResponse.json({ error: 'This CMS section is awaiting its database update. Existing content was not changed.' }, { status: 503 })
  if (error.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
  if (['22023', '22P02', '23502', '23503', '23505', '23514'].includes(error.code ?? '')) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ error: 'Unable to save this section. No changes were committed.' }, { status: 500 })
}

export async function saveCmsSingleton(access: Access, kind: CmsSingletonKind, input: unknown) {
  const envelope = envelopeSchema.safeParse(input)
  if (!envelope.success) return NextResponse.json({ error: envelope.error.issues[0]?.message ?? 'Invalid save payload.' }, { status: 400 })
  const item = cmsSingletonItemSchemas[kind].safeParse(envelope.data.item)
  if (!item.success) return NextResponse.json({ error: item.error.issues[0]?.message ?? 'Invalid section details.' }, { status: 400 })
  const { data, error } = await access.adminClient.rpc('cms_save_singleton_v1', {
    p_actor_id: access.user.id, p_request_id: envelope.data.request_id, p_expected_revision: envelope.data.expected_revision,
    p_kind: kind, p_item: item.data,
  })
  if (error) return singletonError(error)
  return NextResponse.json({ ok: true, ...(data as object) }, { headers: { 'Cache-Control': 'no-store' } })
}
