import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CertificationsEditorClient, type CertificationsInitialData } from './certifications-editor-client'

async function getCertificationsInitialData(): Promise<CertificationsInitialData> {
  const adminClient = createSupabaseAdminClient()

  const [{ data: section, error: sectionError }, { data: items, error: itemsError }] = await Promise.all([
    adminClient
      .from('certifications_section')
      .select('section_key, eyebrow, heading')
      .eq('section_key', 'home_certifications')
      .maybeSingle(),
    adminClient
      .from('certifications_items')
      .select('id, sort_order, title, description, badge, icon_path')
      .order('sort_order', { ascending: true }),
  ])

  if (sectionError) throw new Error(sectionError.message)
  if (itemsError) throw new Error(itemsError.message)

  return {
    section: {
      eyebrow: section?.eyebrow ?? 'Our Promise',
      heading: section?.heading ?? 'Why Choose House of Diams',
    },
    items: items ?? [],
  }
}

export default async function CertificationsEditorPage() {
  const initialData = await getCertificationsInitialData()
  return <CertificationsEditorClient initialData={initialData} />
}
