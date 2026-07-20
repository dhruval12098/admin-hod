import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CMSTabs } from '@/components/cms-tabs'
import { BespokeShowcaseEditorClient, type BespokeShowcaseEditorInitialData } from './bespoke-showcase-editor-client'

async function getBespokeShowcaseInitialData(): Promise<BespokeShowcaseEditorInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('home_bespoke_showcase_section')
    .select('*')
    .eq('section_key', 'home_bespoke_showcase')
    .maybeSingle()

  if (error) throw new Error(error.message)

  return {
    is_enabled: data?.is_enabled ?? true,
    eyebrow: data?.eyebrow ?? 'Bespoke Atelier',
    heading: data?.heading ?? 'Create Something One of One',
    subtitle: data?.subtitle ?? 'Begin a bespoke commission with House of Diams, from first sketch to final setting.',
    cta_label: data?.cta_label ?? 'Start Bespoke Enquiry',
    image_path: data?.image_path ?? '',
    mobile_image_path: data?.mobile_image_path ?? '',
    image_alt: data?.image_alt ?? 'House of Diams bespoke jewellery showcase',
    sort_order: data?.sort_order ?? 0,
  }
}

export default async function BespokeCmsPage() {
  const initialData = await getBespokeShowcaseInitialData()

  return (
    <div>
      <CMSTabs />
      <BespokeShowcaseEditorClient initialData={initialData} />
    </div>
  )
}
