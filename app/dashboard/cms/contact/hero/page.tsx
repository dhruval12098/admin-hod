import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { ContactHeroEditorClient, type ContactHeroInitialData } from './contact-hero-editor-client'

async function getContactHeroInitialData(): Promise<ContactHeroInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('contact_hero')
    .select('id, section_key, eyebrow, heading, subtitle')
    .eq('section_key', 'contact_hero')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    item:
      data ?? {
        section_key: 'contact_hero',
        eyebrow: '',
        heading: '',
        subtitle: '',
      },
  }
}

export default async function ContactHeroPage() {
  const initialData = await getContactHeroInitialData()
  return <ContactHeroEditorClient initialData={initialData} />
}
