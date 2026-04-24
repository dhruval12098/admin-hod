import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

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
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) return NextResponse.json({ error: 'Invalid blog id.' }, { status: 400 })

  const { adminClient } = access
  const { data: post, error } = await adminClient
    .from('blog_posts')
    .select('id, slug, title, title_html, subtitle, category, author, date_label, read_time, bg_key, bg_color, hero_image_path, body_html, is_published, sort_order')
    .eq('id', postId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: tags, error: tagsError } = await adminClient
    .from('blog_post_tags')
    .select('id, tag, sort_order')
    .eq('post_id', postId)
    .order('sort_order', { ascending: true })

  if (tagsError) return NextResponse.json({ error: tagsError.message }, { status: 500 })

  return NextResponse.json({ post, tags: tags ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) return NextResponse.json({ error: 'Invalid blog id.' }, { status: 400 })

  const body = (await request.json().catch(() => null)) as BlogPayload | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const payload = {
    slug: String(body.slug ?? '').trim(),
    title: String(body.title ?? '').trim(),
    title_html: String(body.title_html ?? '').trim(),
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
    updated_at: new Date().toISOString(),
  }

  if (!payload.slug || !payload.title || !payload.title_html || !payload.subtitle || !payload.body_html) {
    return NextResponse.json({ error: 'Slug, title, styled title, subtitle, and body are required.' }, { status: 400 })
  }

  const { adminClient } = access
  const { error } = await adminClient.from('blog_posts').update(payload).eq('id', postId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: deleteError } = await adminClient.from('blog_post_tags').delete().eq('post_id', postId)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const tags = Array.isArray(body.tags) ? body.tags : []
  const rows = tags
    .map((tag, index) => ({ post_id: postId, tag: String(tag ?? '').trim(), sort_order: index + 1 }))
    .filter((tag) => tag.tag)

  if (rows.length > 0) {
    const { error: tagsError } = await adminClient.from('blog_post_tags').insert(rows)
    if (tagsError) return NextResponse.json({ error: tagsError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
