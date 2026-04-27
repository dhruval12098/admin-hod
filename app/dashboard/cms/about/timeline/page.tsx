import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { TimelineEditorClient, type TimelineInitialData } from './timeline-editor-client'

async function getTimelineInitialData(): Promise<TimelineInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('about_timeline')
    .select('id, sort_order, year, label')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    items: data ?? [],
  }
}

export default async function TimelineEditorPage() {
  const initialData = await getTimelineInitialData()
  return <TimelineEditorClient initialData={initialData} />
}
