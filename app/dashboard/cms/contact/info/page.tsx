import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { ContactInfoEditorClient, type ContactInfoInitialData } from './contact-info-editor-client'

async function getContactInfoInitialData(): Promise<ContactInfoInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('contact_info')
    .select('id, sort_order, label, value, note, href, icon_path')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    items: data ?? [],
  }
}

export default async function ContactInfoPage() {
  const initialData = await getContactInfoInitialData()
  return <ContactInfoEditorClient initialData={initialData} />
}
