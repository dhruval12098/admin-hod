import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { TestimonialsEditorClient, type TestimonialsInitialData } from './testimonials-editor-client'

async function getTestimonialsInitialData(): Promise<TestimonialsInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: marquee, error: marqueeError } = await adminClient
    .from('testimonial_marquee')
    .select('id, title')
    .eq('section_key', 'home_testimonial_marquee')
    .maybeSingle()

  if (marqueeError) {
    throw new Error(marqueeError.message)
  }

  if (!marquee) {
    return {
      title: 'Loved by Clients Worldwide',
      items: [],
    }
  }

  const { data: items, error: itemsError } = await adminClient
    .from('testimonial_marquee_items')
    .select('id, sort_order, quote, author')
    .eq('marquee_id', marquee.id)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return {
    title: marquee.title,
    items: items ?? [],
  }
}

export default async function TestimonialsEditorPage() {
  const initialData = await getTestimonialsInitialData()
  return <TestimonialsEditorClient initialData={initialData} />
}
