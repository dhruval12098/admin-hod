import { BlogEditorPage, type BlogCatalogCategory } from '@/components/blog-editor-page'
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

  return <BlogEditorPage mode="edit" id={id} categories={await getCategories()} />
}
