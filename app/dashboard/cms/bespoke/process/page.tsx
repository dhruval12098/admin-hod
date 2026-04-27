import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { BespokeProcessEditorClient, type BespokeProcessInitialData } from './bespoke-process-editor-client'

async function getBespokeProcessInitialData(): Promise<BespokeProcessInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('bespoke_process_cards')
    .select('id, sort_order, eyebrow, title, description')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    items: data ?? [],
  }
}

export default async function BespokeProcessPage() {
  const initialData = await getBespokeProcessInitialData()
  return <BespokeProcessEditorClient initialData={initialData} />
}
