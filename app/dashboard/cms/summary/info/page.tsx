import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { SummaryInfoEditor } from './summary-info-editor'

export const dynamic = 'force-dynamic'

export default async function SummaryInfoPage() {
  const client = createSupabaseAdminClient()
  const { data, error } = await client
    .from('cms_summary_sections')
    .select('id, heading, is_enabled, cms_summary_pointers(id, sort_order, icon_url, pointer_text, video_url, video_link_text)')
    .eq('section_key', 'additional_summary_details')
    .maybeSingle()

  if (error) throw new Error(error.message)

  const pointers = Array.isArray(data?.cms_summary_pointers) ? data.cms_summary_pointers : []
  pointers.sort((a, b) => a.sort_order - b.sort_order)

  return <SummaryInfoEditor initialData={{
    heading: data?.heading ?? 'Additional Summary Details',
    enabled: data?.is_enabled ?? true,
    hasSection: Boolean(data),
    pointers,
  }} />
}
