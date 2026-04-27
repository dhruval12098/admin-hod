import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { FoundersEditorClient, type FoundersInitialData } from './founders-editor-client'

async function getFoundersInitialData(): Promise<FoundersInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('about_founders')
    .select('id, sort_order, name, designation, bio, image_path')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    items: data ?? [],
  }
}

export default async function FoundersEditorPage() {
  const initialData = await getFoundersInitialData()
  return <FoundersEditorClient initialData={initialData} />
}
