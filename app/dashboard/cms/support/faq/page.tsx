import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { SupportFaqEditorClient, type SupportFaqInitialData } from './support-faq-editor-client'

async function getSupportFaqInitialData(): Promise<SupportFaqInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: section, error: sectionError } = await adminClient
    .from('support_faq_section')
    .select('id, section_key, title, subtitle')
    .eq('section_key', 'global_support_faq')
    .maybeSingle()

  if (sectionError) throw new Error(sectionError.message)

  if (!section) {
    return {
      section: { section_key: 'global_support_faq', title: 'Frequently Asked Questions', subtitle: '' },
      items: [],
    }
  }

  const { data: items, error: itemsError } = await adminClient
    .from('support_faq_items')
    .select('id, sort_order, question, answer, is_active')
    .eq('section_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) throw new Error(itemsError.message)

  return { section, items: items ?? [] }
}

export default async function SupportFaqPage() {
  const initialData = await getSupportFaqInitialData()
  return <SupportFaqEditorClient initialData={initialData} />
}
