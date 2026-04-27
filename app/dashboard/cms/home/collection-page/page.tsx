import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CollectionPageEditorClient, type CollectionPageEditorInitialData } from './collection-page-editor-client'

async function getInitialData(): Promise<CollectionPageEditorInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data } = await adminClient
    .from('collection_page_config')
    .select('*')
    .eq('section_key', 'main_collection_page')
    .maybeSingle()

  return {
    page_enabled: data?.page_enabled ?? false,
    show_in_footer: data?.show_in_footer ?? false,
    show_home_showcase: data?.show_home_showcase ?? false,
    showcase_heading: data?.showcase_heading ?? 'Collection',
    showcase_subtitle: data?.showcase_subtitle ?? 'Browse House of Diams collection pieces in a dedicated enquiry-first showcase.',
    showcase_cta_label: data?.showcase_cta_label ?? 'Explore Collection',
    showcase_cta_href: data?.showcase_cta_href ?? '/collection',
    showcase_image_path: data?.showcase_image_path ?? '',
    showcase_mobile_image_path: data?.showcase_mobile_image_path ?? '',
  }
}

export default async function CollectionPageEditorPage() {
  return <CollectionPageEditorClient initialData={await getInitialData()} />
}
