import { HipHopShowcaseEditorClient, type HipHopShowcaseInitialData } from './hiphop-showcase-editor-client'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'

async function getHipHopShowcaseInitialData(): Promise<HipHopShowcaseInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data, error } = await adminClient
    .from('hiphop_showcase_section')
    .select('eyebrow, heading_line_1, heading_line_2, heading_emphasis, cta_label, cta_link, image_path, image_alt')
    .eq('section_key', 'home_hiphop_showcase')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    eyebrow: data?.eyebrow ?? 'Hip Hop Collection · House of Diams',
    heading_line_1: data?.heading_line_1 ?? 'Ice That',
    heading_line_2: data?.heading_line_2 ?? 'Speaks',
    heading_emphasis: data?.heading_emphasis ?? 'Louder.',
    cta_label: data?.cta_label ?? 'Shop Iced Pieces',
    cta_link: data?.cta_link ?? '/hiphop',
    image_path: data?.image_path ?? '',
    image_alt: data?.image_alt ?? 'House of Diams Hip Hop Collection',
  }
}

export default async function HipHopShowcaseEditorPage() {
  const initialData = await getHipHopShowcaseInitialData()
  return <HipHopShowcaseEditorClient initialData={initialData} />
}
