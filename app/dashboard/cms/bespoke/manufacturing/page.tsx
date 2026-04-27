import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  BespokeManufacturingEditorClient,
  type BespokeManufacturingInitialData,
} from './bespoke-manufacturing-editor-client'

async function getBespokeManufacturingInitialData(): Promise<BespokeManufacturingInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('bespoke_process_steps')
    .select('id, sort_order, step, eyebrow, title, description, image_path')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    items: data ?? [],
  }
}

export default async function BespokeManufacturingPage() {
  const initialData = await getBespokeManufacturingInitialData()
  return <BespokeManufacturingEditorClient initialData={initialData} />
}
