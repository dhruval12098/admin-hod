import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CouplesEditorClient, type CouplesInitialData } from './couples-editor-client'

async function getCouplesInitialData(): Promise<CouplesInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: section, error: sectionError } = await adminClient
    .from('couples_section')
    .select('id, section_key, eyebrow, heading, subtitle')
    .eq('section_key', 'home_couples')
    .maybeSingle()

  if (sectionError) {
    throw new Error(sectionError.message)
  }

  const itemsResult = section
    ? await adminClient
        .from('couples_items')
        .select('id, sort_order, names, location, story, product_name, product_link, product_detail, image_path')
        .eq('section_id', section.id)
        .order('sort_order', { ascending: true })
    : { data: [], error: null }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message)
  }

  return {
    section: section ?? {
      section_key: 'home_couples',
      eyebrow: 'Love Stories',
      heading: 'Our Cute Couples',
      subtitle: 'Real couples. Real proposals. Real diamonds. Every ring tells a story.',
    },
    items: itemsResult.data ?? [],
  }
}

export default async function CouplesEditorPage() {
  const initialData = await getCouplesInitialData()
  return <CouplesEditorClient initialData={initialData} />
}
