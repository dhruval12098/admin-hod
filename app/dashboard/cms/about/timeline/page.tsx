import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCmsContentListSnapshot } from '@/lib/cms-content-list-save'
import { TimelineEditorClient, type TimelineInitialData } from './timeline-editor-client'

async function getTimelineInitialData(): Promise<TimelineInitialData> {
  const adminClient = createSupabaseAdminClient()
  const snapshot = await loadCmsContentListSnapshot(adminClient, 'about_timeline')

  return {
    revision: snapshot.revision,
    items: snapshot.items.map((item) => ({ id: Number(item.id), sort_order: Number(item.sort_order), year: String(item.year ?? ''), label: String(item.label ?? '') })),
  }
}

export default async function TimelineEditorPage() {
  const initialData = await getTimelineInitialData()
  return <TimelineEditorClient initialData={initialData} />
}
