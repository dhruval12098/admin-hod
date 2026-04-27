import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { AboutHeroEditorClient, type AboutHeroInitialData } from './about-hero-editor-client'

async function getAboutHeroInitialData(): Promise<AboutHeroInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('about_hero')
    .select('id, section_key, eyebrow, heading, subtitle')
    .eq('section_key', 'about_hero')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (
    data ?? {
      section_key: 'about_hero',
      eyebrow: 'Our Story',
      heading: 'Two Friends. One Vision.',
      subtitle: 'House of Diams was born in Surat, India.',
    }
  )
}

export default async function AboutHeroEditorPage() {
  const initialData = await getAboutHeroInitialData()
  return <AboutHeroEditorClient initialData={initialData} />
}
