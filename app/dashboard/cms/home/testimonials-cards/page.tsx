import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  TestimonialsCardsEditorClient,
  type TestimonialsCardsInitialData,
} from './testimonials-cards-editor-client'

async function getTestimonialsCardsInitialData(): Promise<TestimonialsCardsInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: section, error: sectionError } = await adminClient
    .from('testimonials_section')
    .select('id, section_key, eyebrow, heading')
    .eq('section_key', 'home_testimonials')
    .maybeSingle()

  if (sectionError) {
    throw new Error(sectionError.message)
  }

  const { data: items, error: itemsError } = await adminClient
    .from('testimonials_items')
    .select('id, sort_order, quote, author, origin, rating')
    .eq('section_id', section?.id ?? null)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return {
    section: section ?? {
      section_key: 'home_testimonials',
      eyebrow: 'Client Stories',
      heading: 'What Our Clients Say',
    },
    items: items ?? [],
  }
}

export default async function TestimonialsCardsEditorPage() {
  const initialData = await getTestimonialsCardsInitialData()
  return <TestimonialsCardsEditorClient initialData={initialData} />
}
