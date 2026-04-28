import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CMSTabs } from '@/components/cms-tabs'
import { CollectionPageEditorClient, type CollectionPageEditorInitialData } from '../home/collection-page/collection-page-editor-client'

async function getCollectionInitialData(): Promise<CollectionPageEditorInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('collection_page_config')
    .select('*')
    .eq('section_key', 'main_collection_page')
    .maybeSingle()

  if (error) throw new Error(error.message)

  return {
    page_enabled: Boolean(data?.page_enabled),
    show_in_footer: Boolean(data?.show_in_footer),
    show_home_showcase: Boolean(data?.show_home_showcase),
    showcase_heading: data?.showcase_heading ?? '',
    showcase_subtitle: data?.showcase_subtitle ?? '',
    showcase_cta_label: data?.showcase_cta_label ?? '',
    showcase_cta_href: data?.showcase_cta_href ?? '/collection',
    showcase_image_path: data?.showcase_image_path ?? '',
    showcase_mobile_image_path: data?.showcase_mobile_image_path ?? '',
  }
}

export default async function CollectionCmsPage() {
  const initialData = await getCollectionInitialData()

  return (
    <div>
      <CMSTabs />
      <CollectionPageEditorClient initialData={initialData} />
    </div>
  )
}
