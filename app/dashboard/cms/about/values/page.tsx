import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { ValuesEditorClient, type ValuesInitialData } from './values-editor-client'

async function getValuesInitialData(): Promise<ValuesInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('about_values')
    .select('id, sort_order, icon_path, title, description')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    items: data ?? [],
  }
}

export default async function ValuesEditorPage() {
  const initialData = await getValuesInitialData()
  return <ValuesEditorClient initialData={initialData} />
}
