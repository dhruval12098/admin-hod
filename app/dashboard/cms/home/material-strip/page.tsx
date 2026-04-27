import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { MaterialStripEditorClient, type MaterialStripInitialData } from './material-strip-editor-client'

async function getMaterialStripInitialData(): Promise<MaterialStripInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('material_strip_items')
    .select('id, sort_order, title, description, icon_path')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return { items: data ?? [] }
}

export default async function MaterialStripEditorPage() {
  const initialData = await getMaterialStripInitialData()
  return <MaterialStripEditorClient initialData={initialData} />
}
