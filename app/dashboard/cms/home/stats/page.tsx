import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { StatsEditorClient, type StatsInitialData } from './stats-editor-client'

async function getStatsInitialData(): Promise<StatsInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('stats_strip_items')
    .select('id, sort_order, target, suffix, label')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  return { items: data ?? [] }
}

export default async function StatsEditorPage() {
  const initialData = await getStatsInitialData()
  return <StatsEditorClient initialData={initialData} />
}
