import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { HipHopEditorClient, type HipHopInitialData } from './hiphop-editor-client'

async function getHipHopInitialData(): Promise<HipHopInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: section, error: sectionError } = await adminClient
    .from('hiphop_hero_content')
    .select('*')
    .eq('section_key', 'hiphop_hero')
    .maybeSingle()

  if (sectionError) {
    throw new Error(sectionError.message)
  }

  if (!section) {
    return {
      section: {
        eyebrow: 'Hip Hop',
        headline: 'Hip Hop Jewellery',
        subtitle:
          'Fully iced chains, grillz, pendants and statement rings - handcrafted with CVD diamonds in 14K and 18K gold.',
        slider_enabled: false,
      },
      items: [],
    }
  }

  const { data: items, error: itemsError } = await adminClient
    .from('hiphop_hero_slider_items')
    .select('id, sort_order, image_path, mobile_image_path, button_text, button_link')
    .eq('hero_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    if (itemsError.message.includes("Could not find the table")) {
      return {
        section: {
          eyebrow: section.eyebrow ?? 'Hip Hop',
          headline: section.headline ?? 'Hip Hop Jewellery',
          subtitle: section.subtitle ?? '',
          slider_enabled: section.slider_enabled ?? false,
        },
        items: [],
      }
    }
    throw new Error(itemsError.message)
  }

  return {
    section: {
      eyebrow: section.eyebrow ?? 'Hip Hop',
      headline: section.headline ?? 'Hip Hop Jewellery',
      subtitle: section.subtitle ?? '',
      slider_enabled: section.slider_enabled ?? false,
    },
    items: items ?? [],
  }
}

export default async function HipHopEditorPage() {
  const initialData = await getHipHopInitialData()
  return <HipHopEditorClient initialData={initialData} />
}
