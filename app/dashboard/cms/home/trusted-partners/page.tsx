import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { TrustedPartnersEditorClient, type TrustedPartnersInitialData } from './trusted-partners-editor-client'

async function getTrustedPartnersInitialData(): Promise<TrustedPartnersInitialData> {
  const adminClient = createSupabaseAdminClient()

  const { data: section, error: sectionError } = await adminClient
    .from('home_trusted_partners_section')
    .select('id, heading, is_enabled')
    .eq('section_key', 'home_trusted_partners')
    .maybeSingle()

  if (sectionError) throw new Error(sectionError.message)

  const { data: logos, error: logosError } = section?.id
    ? await adminClient
        .from('home_trusted_partner_logos')
        .select('id, name, logo_path, logo_alt, link_url, display_order, status')
        .eq('section_id', section.id)
        .order('display_order', { ascending: true })
    : { data: [], error: null }

  if (logosError) throw new Error(logosError.message)

  return {
    heading: section?.heading ?? 'Trusted Partners',
    is_enabled: section?.is_enabled ?? true,
    logos: logos ?? [],
  }
}

export default async function TrustedPartnersEditorPage() {
  const initialData = await getTrustedPartnersInitialData()
  return <TrustedPartnersEditorClient initialData={initialData} />
}
