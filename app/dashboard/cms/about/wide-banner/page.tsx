import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { AboutWideBannerEditorClient, type AboutWideBannerInitialData } from './about-wide-banner-editor-client'

const fallback: AboutWideBannerInitialData = {
  section_key: 'about_wide_banner', is_enabled: true, desktop_image_path: '', mobile_image_path: '', image_alt: '',
  heading: '', paragraph: '', show_button: false, button_label: '', button_link: '', content_position: 'left', sort_order: 1,
}

export default async function AboutWideBannerEditorPage() {
  const { data, error } = await createSupabaseAdminClient().from('about_wide_banner')
    .select('section_key, is_enabled, desktop_image_path, mobile_image_path, image_alt, heading, paragraph, show_button, button_label, button_link, content_position, sort_order')
    .eq('section_key', 'about_wide_banner').maybeSingle()
  if (error) throw new Error(error.message)
  return <AboutWideBannerEditorClient initialData={{
    ...fallback, ...(data ?? {}), desktop_image_path: data?.desktop_image_path ?? '', mobile_image_path: data?.mobile_image_path ?? '',
    image_alt: data?.image_alt ?? '', heading: data?.heading ?? '', paragraph: data?.paragraph ?? '', button_label: data?.button_label ?? '',
    button_link: data?.button_link ?? '', content_position: 'bottom-center',
  }} />
}


