import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { BlogListClient, type BlogListItem } from './blog-list-client'

async function getBlogRows(): Promise<BlogListItem[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('blog_posts')
    .select('id, slug, title, category, author, date_label, read_time, is_published, sort_order, updated_at')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as BlogListItem[]
}

export default async function BlogCMSPage() {
  const items = await getBlogRows()
  return <BlogListClient initialItems={items} />
}
