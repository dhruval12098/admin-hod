import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { PromotionEditorClient, type PromotionInitialData } from './promotion-editor-client'

async function getPromotionInitialData(): Promise<PromotionInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('promotion_popup')
    .select('*')
    .eq('section_key', 'global_promotion_popup')
    .maybeSingle()

  if (error) throw new Error(error.message)

  return {
    item: data
      ? {
          label: data.label ?? '',
          title: data.title ?? '',
          description: data.description ?? '',
          cta_text: data.cta_text ?? '',
          cta_link: data.cta_link ?? '',
          image_path: data.image_path ?? '',
          image_alt: data.image_alt ?? '',
          image_only_mode: Boolean(data.image_only_mode),
          is_active: Boolean(data.is_active),
          show_once_per_session: data.show_once_per_session !== false,
        }
      : {
          label: '',
          title: '',
          description: '',
          cta_text: '',
          cta_link: '',
          image_path: '',
          image_alt: '',
          image_only_mode: false,
          is_active: true,
          show_once_per_session: true,
        },
  }
}

export default async function PromotionPage() {
  const initialData = await getPromotionInitialData()
  return <PromotionEditorClient initialData={initialData} />
}
