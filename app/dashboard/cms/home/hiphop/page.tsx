import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { HipHopEditorClient, type HipHopInitialData } from './hiphop-editor-client'

const fallbackSection = {
  eyebrow: 'Hip Hop',
  headline: 'Hip Hop Jewellery',
  subtitle:
    'Fully iced chains, grillz, pendants and statement rings - handcrafted with CVD diamonds in 14K and 18K gold.',
  slider_enabled: false,
}

async function getHipHopInitialData(): Promise<HipHopInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: section, error: sectionError } = await adminClient
    .from('hiphop_hero_content')
    .select('*')
    .eq('section_key', 'hiphop_hero')
    .maybeSingle()

  if (sectionError && !sectionError.message.includes("Could not find the table")) {
    throw new Error(sectionError.message)
  }

  if (sectionError?.message.includes("Could not find the table")) {
    const { data: legacySection, error: legacyError } = await adminClient
      .from('hiphop_showcase_section')
      .select('eyebrow, heading_line_1, heading_line_2, heading_emphasis, cta_label, cta_link, image_path')
      .eq('section_key', 'home_hiphop_showcase')
      .maybeSingle()

    if (legacyError && !legacyError.message.includes("Could not find the table")) {
      throw new Error(legacyError.message)
    }

    if (!legacySection) {
      return {
        section: fallbackSection,
        items: [],
      }
    }

    const legacyHeadline = [
      legacySection.heading_line_1,
      legacySection.heading_line_2,
      legacySection.heading_emphasis,
    ]
      .filter((part) => typeof part === 'string' && part.trim().length > 0)
      .join(' ')

    return {
      section: {
        eyebrow: legacySection.eyebrow ?? fallbackSection.eyebrow,
        headline: legacyHeadline || fallbackSection.headline,
        subtitle: fallbackSection.subtitle,
        slider_enabled: Boolean(legacySection.image_path),
      },
      items: legacySection.image_path
        ? [
            {
              sort_order: 1,
              image_path: legacySection.image_path,
              mobile_image_path: legacySection.image_path,
              button_text: legacySection.cta_label ?? 'Explore',
              button_link: legacySection.cta_link ?? '/hiphop',
            },
          ]
        : [],
    }
  }

  if (!section) {
    return {
      section: fallbackSection,
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
