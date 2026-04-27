import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { HeroEditorClient, type HeroEditorInitialData } from './hero-editor-client'

async function getHeroInitialData(): Promise<HeroEditorInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: section, error: sectionError } = await adminClient
    .from('homepage_hero')
    .select('id, eyebrow, headline, subtitle, slider_enabled')
    .eq('section_key', 'home_hero')
    .single()

  if (sectionError) {
    throw new Error(sectionError.message)
  }

  const { data: items, error: itemsError } = await adminClient
    .from('homepage_hero_slider_items')
    .select('id, sort_order, image_path, mobile_image_path, button_text, button_link')
    .eq('hero_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return {
    section: {
      eyebrow: section.eyebrow ?? '',
      headline: section.headline ?? '',
      subtitle: section.subtitle ?? '',
      slider_enabled: section.slider_enabled ?? false,
    },
    items: items ?? [],
  }
}

export default async function HeroEditorPage() {
  const initialData = await getHeroInitialData()
  return <HeroEditorClient initialData={initialData} />
}
