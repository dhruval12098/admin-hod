import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { createUniqueBlogSlug } from '@/lib/blog-slug'

type BlogPayload = {
  slug?: string
  title?: string
  title_html?: string
  subtitle?: string
  category?: string
  author?: string
  date_label?: string
  read_time?: string
  bg_key?: string
  bg_color?: string
  hero_image_path?: string
  body_html?: string
  is_published?: boolean
  sort_order?: number
  tags?: string[]
  products?: string[]
  content_blocks?: Array<{
    id?: number
    block_type?: 'text' | 'image' | 'heading' | 'quote'
    sort_order?: number
    heading?: string
    body_html?: string
    image_path?: string
    image_alt?: string
    image_caption?: string
    is_enabled?: boolean
  }>
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { data, error } = await adminClient
    .from('blog_posts')
    .select('id, slug, title, category, author, date_label, read_time, is_published, sort_order, updated_at')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as BlogPayload | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const title = String(body.title ?? '').trim()
  const titleHtml = String(body.title_html ?? '').trim() || title

  const { adminClient } = access
  let slug: string
  try {
    slug = await createUniqueBlogSlug(adminClient, title)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create blog URL.' }, { status: 500 })
  }

  const payload = {
    slug,
    title,
    title_html: titleHtml,
    subtitle: String(body.subtitle ?? '').trim(),
    category: String(body.category ?? '').trim(),
    author: String(body.author ?? '').trim(),
    date_label: String(body.date_label ?? '').trim(),
    read_time: String(body.read_time ?? '').trim(),
    bg_key: String(body.bg_key ?? '').trim(),
    bg_color: String(body.bg_color ?? '').trim(),
    hero_image_path: String(body.hero_image_path ?? '').trim(),
    body_html: String(body.body_html ?? '').trim(),
    is_published: Boolean(body.is_published),
    sort_order: Number(body.sort_order) || 0,
  }

  if (!payload.title || !payload.subtitle || !payload.body_html) {
    return NextResponse.json({ error: 'Title, subtitle, and body are required.' }, { status: 400 })
  }

  const { data: post, error } = await adminClient
    .from('blog_posts')
    .insert(payload)
    .select('id')
    .single()

  if (error || !post) return NextResponse.json({ error: error?.message ?? 'Unable to create blog.' }, { status: 500 })

  const tags = Array.isArray(body.tags) ? body.tags : []
  const rows = tags
    .map((tag, index) => ({ post_id: post.id, tag: String(tag ?? '').trim(), sort_order: index + 1 }))
    .filter((tag) => tag.tag)

  if (rows.length > 0) {
    const { error: tagsError } = await adminClient.from('blog_post_tags').insert(rows)
    if (tagsError) return NextResponse.json({ error: tagsError.message }, { status: 500 })
  }

  const products = Array.isArray(body.products) ? body.products : []
  const productRows = products
    .map((productId, index) => ({ post_id: post.id, product_id: String(productId ?? '').trim(), sort_order: index + 1 }))
    .filter((product) => product.product_id)

  if (productRows.length > 0) {
    const { error: productsError } = await adminClient.from('blog_post_products').insert(productRows)
    if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 })
  }

  const contentBlocks = Array.isArray(body.content_blocks) ? body.content_blocks : []
  const blockRows = contentBlocks
    .map((block, index) => ({
      post_id: post.id,
      block_type: block.block_type ?? 'text',
      sort_order: Number(block.sort_order) || index + 1,
      heading: String(block.heading ?? '').trim() || null,
      body_html: String(block.body_html ?? '').trim() || null,
      image_path: String(block.image_path ?? '').trim() || null,
      image_alt: String(block.image_alt ?? '').trim() || null,
      image_caption: String(block.image_caption ?? '').trim() || null,
      is_enabled: block.is_enabled !== false,
    }))
    .filter((block) => {
      if (block.block_type === 'image') return Boolean(block.image_path)
      if (block.block_type === 'heading') return Boolean(block.heading)
      return Boolean(block.body_html)
    })

  if (blockRows.length > 0) {
    const { error: blocksError } = await adminClient.from('blog_post_content_blocks').insert(blockRows)
    if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: post.id, slug })
}
