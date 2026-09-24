import { BlogEditorPage, type BlogCatalogCategory, type BlogEditorInitialData } from '@/components/blog-editor-page'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'

async function getCategories(): Promise<BlogCatalogCategory[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from('catalog_categories')
    .select('id, name, slug')
    .eq('status', 'active')
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) throw new Error('Invalid blog id.')

  const adminClient = createSupabaseAdminClient()
  const [categories, fullPostResult] = await Promise.all([
    getCategories(),
    adminClient
      .from('blog_posts')
      .select('id, slug, title, title_html, subtitle, category, catalog_category_id, author, date_label, read_time, bg_key, bg_color, hero_image_path, card_title, card_image_path, hero_image_alt, body_html, is_published, sort_order')
      .eq('id', postId)
      .single(),
  ])

  let post = fullPostResult.data as BlogEditorInitialData['post'] | null
  let postError = fullPostResult.error
  if (postError && (postError.code === '42703' || postError.code === 'PGRST204')) {
    const legacyResult = await adminClient
      .from('blog_posts')
      .select('id, slug, title, title_html, subtitle, category, author, date_label, read_time, bg_key, bg_color, hero_image_path, body_html, is_published, sort_order')
      .eq('id', postId)
      .single()
    post = legacyResult.data
      ? { ...legacyResult.data, catalog_category_id: '', card_title: '', card_image_path: '', hero_image_alt: '' } as BlogEditorInitialData['post']
      : null
    postError = legacyResult.error
  }
  if (postError || !post) throw new Error(postError?.message ?? 'Blog post not found.')

  const [tagsResult, blocksResult, productsResult] = await Promise.all([
    adminClient.from('blog_post_tags').select('id, tag, sort_order').eq('post_id', postId).order('sort_order', { ascending: true }),
    adminClient.from('blog_post_content_blocks').select('id, block_type, sort_order, heading, body_html, image_path, image_alt, image_caption, is_enabled').eq('post_id', postId).order('sort_order', { ascending: true }),
    adminClient.from('blog_post_products').select('product_id, sort_order, product:products(id, slug, name, base_price, status)').eq('post_id', postId).order('sort_order', { ascending: true }),
  ])

  const relatedError = tagsResult.error ?? blocksResult.error ?? productsResult.error
  if (relatedError) throw new Error(relatedError.message)

  const initialData: BlogEditorInitialData = {
    post,
    tags: tagsResult.data ?? [],
    content_blocks: (blocksResult.data ?? []) as BlogEditorInitialData['content_blocks'],
    products: (productsResult.data ?? []) as unknown as BlogEditorInitialData['products'],
  }

  return <BlogEditorPage mode="edit" id={id} categories={categories} initialData={initialData} />
}
