import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  SupportAnnouncementBarEditorClient,
  type SupportAnnouncementBarInitialData,
} from './support-announcement-bar-editor-client'

async function getSupportAnnouncementBarInitialData(): Promise<SupportAnnouncementBarInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data: section, error: sectionError } = await adminClient
    .from('support_announcement_bar')
    .select('id, section_key, is_active, autoplay, speed_ms')
    .eq('section_key', 'global_support_announcement_bar')
    .maybeSingle()

  if (sectionError) throw new Error(sectionError.message)

  if (!section) {
    return {
      section: { section_key: 'global_support_announcement_bar', is_active: true, autoplay: true, speed_ms: 40 },
      items: [],
    }
  }

  const { data: items, error: itemsError } = await adminClient
    .from('support_announcement_bar_items')
    .select('id, sort_order, message, link_url, open_in_new_tab, is_active')
    .eq('bar_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) throw new Error(itemsError.message)

  return { section, items: items ?? [] }
}

export default async function SupportAnnouncementBarPage() {
  const initialData = await getSupportAnnouncementBarInitialData()
  return <SupportAnnouncementBarEditorClient initialData={initialData} />
}
