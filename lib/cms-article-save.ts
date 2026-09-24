import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { assertAdmin } from './cms-auth'
import { createBlogSlug } from './blog-slug'
import { createEducationSlug } from './education-slug'

export type CmsArticleKind = 'blog' | 'education'
type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>

const persistedId = z.union([z.number().int().positive(), z.string().regex(/^[1-9][0-9]*$/)]).transform(String)
const uuid = z.string().uuid()
const optionalText = z.string().max(200_000).default('')

const tagSchema = z.object({ id: persistedId.optional(), tag: z.string().trim().min(1).max(200) }).strict()
const productSchema = z.object({ id: persistedId.optional(), product_id: uuid }).strict()
const blockSchema = z.object({
  id: persistedId.optional(),
  block_type: z.enum(['text', 'image', 'heading', 'quote']),
  heading: optionalText,
  body_html: optionalText,
  image_path: optionalText,
  image_alt: optionalText,
  image_caption: optionalText,
  is_enabled: z.boolean(),
}).strict().superRefine((block, context) => {
  const required = block.block_type === 'image' ? block.image_path
    : block.block_type === 'heading' ? block.heading : block.body_html
  if (!required.trim()) context.addIssue({ code: z.ZodIssueCode.custom, message: 'The content block is incomplete.' })
})

const articlePostSchema = z.object({
  slug: optionalText,
  title: z.string().trim().min(1).max(500),
  title_html: optionalText,
  card_title: optionalText,
  subtitle: z.string().trim().min(1).max(10_000),
  category: optionalText,
  catalog_category_id: z.union([uuid, z.literal(''), z.null()]).optional(),
  author: optionalText,
  date_label: optionalText,
  read_time: optionalText,
  bg_key: optionalText,
  bg_color: optionalText,
  hero_image_path: optionalText,
  card_image_path: optionalText,
  hero_image_alt: optionalText,
  body_html: z.string().trim().min(1).max(1_000_000),
  is_published: z.boolean(),
  sort_order: z.coerce.number().int().min(-1_000_000).max(1_000_000),
}).strict()

export const articleSaveSchema = z.object({
  request_id: uuid,
  expected_revision: z.string().regex(/^[a-f0-9]{32}$/).nullable().optional(),
  post: articlePostSchema,
  tags: z.array(tagSchema).max(100),
  products: z.array(productSchema).max(100),
  content_blocks: z.array(blockSchema).max(100),
  deleted_tag_ids: z.array(persistedId).max(100),
  deleted_product_ids: z.array(persistedId).max(100),
  deleted_block_ids: z.array(persistedId).max(100),
}).strict().superRefine((payload, context) => {
  const checks: Array<[string, Array<string | undefined>]> = [
    ['tag', payload.tags.map((item) => item.id)],
    ['product relation', payload.products.map((item) => item.id)],
    ['content block', payload.content_blocks.map((item) => item.id)],
  ]
  for (const [label, ids] of checks) {
    const saved = ids.filter((id): id is string => Boolean(id))
    if (new Set(saved).size !== saved.length) context.addIssue({ code: z.ZodIssueCode.custom, message: `A ${label} ID is duplicated.` })
  }
  const normalizedTags = payload.tags.map((item) => item.tag.toLowerCase())
  if (new Set(normalizedTags).size !== normalizedTags.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Tags must be unique.' })
  }
  if (new Set(payload.products.map((item) => item.product_id)).size !== payload.products.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Products may only be selected once.' })
  }
})

export const articleDeleteSchema = z.object({
  request_id: uuid,
  expected_revision: z.string().regex(/^[a-f0-9]{32}$/),
}).strict()

type ArticleSnapshot = {
  post: Record<string, unknown>
  tags: Array<Record<string, unknown>>
  products: Array<{ id: number | string; product_id: string; sort_order: number }>
  content_blocks: Array<Record<string, unknown>>
  revision: string
}

function articleError(error: { code?: string; message?: string }, action: 'load' | 'save' | 'delete') {
  if (error.code === 'PGRST202' || error.code === '42883') {
    return NextResponse.json({ error: 'This CMS section is awaiting its database update. Existing content was not changed.' }, { status: 503 })
  }
  if (error.code === 'P0002') return NextResponse.json({ error: 'Article not found.' }, { status: 404 })
  if (error.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
  if (['22023', '22P02', '23503', '23505', '23514'].includes(error.code ?? '')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ error: `Unable to ${action} this article. No partial changes were committed.` }, { status: 500 })
}

export async function enrichArticleSnapshot(access: Access, snapshot: ArticleSnapshot) {
  const productIds = snapshot.products.map((item) => item.product_id)
  let productsById = new Map<string, Record<string, unknown>>()
  if (productIds.length) {
    const { data, error } = await access.adminClient.from('products')
      .select('id, slug, name, base_price, status').in('id', productIds)
    if (error) throw new Error('Unable to load linked products.')
    productsById = new Map((data ?? []).map((product) => [String(product.id), product]))
  }
  return {
    ...snapshot,
    products: snapshot.products.map((relation) => ({
      ...relation,
      product: productsById.get(relation.product_id) ?? null,
    })),
  }
}

export async function loadCmsArticle(access: Access, kind: CmsArticleKind, postId: number) {
  const { data, error } = await access.adminClient.rpc('cms_article_snapshot_v1', { p_kind: kind, p_post_id: postId })
  if (error) return articleError(error, 'load')
  try {
    return NextResponse.json(await enrichArticleSnapshot(access, data as ArticleSnapshot), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load linked products.' }, { status: 500 })
  }
}

export async function saveCmsArticle(access: Access, kind: CmsArticleKind, postId: number | null, input: unknown) {
  const parsed = articleSaveSchema.safeParse(input)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid article payload.' }, { status: 400 })
  }
  if (postId === null && parsed.data.expected_revision) {
    return NextResponse.json({ error: 'A new article cannot use an existing revision.' }, { status: 400 })
  }
  if (postId !== null && !parsed.data.expected_revision) {
    return NextResponse.json({ error: 'This editor is out of date. Reload it before saving.' }, { status: 409 })
  }

  const slugBase = kind === 'blog' ? createBlogSlug(parsed.data.post.title) : createEducationSlug(parsed.data.post.title)
  const post = {
    ...parsed.data.post,
    slug_base: slugBase,
    title_html: parsed.data.post.title_html.trim() || parsed.data.post.title,
    catalog_category_id: kind === 'blog' ? parsed.data.post.catalog_category_id || null : null,
  }
  const { data, error } = await access.adminClient.rpc('cms_save_article_v1', {
    p_actor_id: access.user.id,
    p_request_id: parsed.data.request_id,
    p_kind: kind,
    p_post_id: postId,
    p_expected_revision: parsed.data.expected_revision ?? null,
    p_post: post,
    p_tags: parsed.data.tags,
    p_products: parsed.data.products,
    p_blocks: parsed.data.content_blocks,
    p_deleted_tag_ids: parsed.data.deleted_tag_ids,
    p_deleted_product_ids: parsed.data.deleted_product_ids,
    p_deleted_block_ids: parsed.data.deleted_block_ids,
  })
  if (error) return articleError(error, 'save')
  try {
    const result = await enrichArticleSnapshot(access, data as ArticleSnapshot)
    return NextResponse.json({ ok: true, ...result, id: result.post.id, slug: result.post.slug }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'The article was saved, but its linked product details could not be reloaded.' }, { status: 500 })
  }
}

export async function deleteCmsArticle(access: Access, kind: CmsArticleKind, postId: number, input: unknown) {
  const parsed = articleDeleteSchema.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: 'Reload this editor before deleting.' }, { status: 409 })
  const { data, error } = await access.adminClient.rpc('cms_delete_article_v1', {
    p_actor_id: access.user.id,
    p_request_id: parsed.data.request_id,
    p_kind: kind,
    p_post_id: postId,
    p_expected_revision: parsed.data.expected_revision,
  })
  if (error) return articleError(error, 'delete')
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
