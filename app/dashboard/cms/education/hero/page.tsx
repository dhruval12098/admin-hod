import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { EducationHeroEditorClient, type EducationHeroForm } from './education-hero-editor-client'

export default async function EducationHeroPage() {
  const { data } = await createSupabaseAdminClient().from('education_page_hero').select('*').eq('id', 1).maybeSingle()
  const initialData: EducationHeroForm = {
    is_enabled: data?.is_enabled ?? true,
    heading: data?.heading ?? 'Education',
    paragraph: data?.paragraph ?? 'Clear, considered guidance on diamonds, jewellery, craftsmanship, care, and confident buying decisions.',
    button_label: data?.button_label ?? 'Explore articles',
    button_link: data?.button_link ?? '#education-articles',
    desktop_image_path: data?.desktop_image_path ?? '', desktop_image_alt: data?.desktop_image_alt ?? '',
    mobile_image_path: data?.mobile_image_path ?? '', mobile_image_alt: data?.mobile_image_alt ?? '',
  }
  return <EducationHeroEditorClient initialData={initialData} />
}