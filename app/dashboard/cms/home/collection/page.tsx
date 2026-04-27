import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CollectionEditorClient, type CollectionEditorInitialData } from './collection-editor-client'

async function getCollectionInitialData(): Promise<CollectionEditorInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('collection_items')
    .select('sort_order, label, title, description, image_path, link')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return { items: data ?? [] }
}

export default async function CollectionEditorPage() {
  const initialData = await getCollectionInitialData()
  return <CollectionEditorClient initialData={initialData} />
}
