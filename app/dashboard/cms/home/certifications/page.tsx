import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CertificationsEditorClient, type CertificationsInitialData } from './certifications-editor-client'
import { loadHomeGroup1Snapshot } from '@/lib/cms-home-group1-save'

async function getCertificationsInitialData(): Promise<CertificationsInitialData> {
  const adminClient = createSupabaseAdminClient()

  const snapshot = await loadHomeGroup1Snapshot(adminClient, 'certifications')
  const section = snapshot.section
  const items = snapshot.items

  return {
    section: {
      eyebrow: String(section?.eyebrow ?? 'Our Promise'),
      heading: String(section?.heading ?? 'Why Choose House of Diams'),
    },
    items: items.map((item) => ({
      id: Number(item.id),
      sort_order: Number(item.sort_order),
      title: String(item.title ?? ''),
      description: String(item.description ?? ''),
      badge: String(item.badge ?? ''),
      icon_path: String(item.icon_path ?? ''),
    })),
    revision: snapshot.revision,
  }
}

export default async function CertificationsEditorPage() {
  const initialData = await getCertificationsInitialData()
  return <CertificationsEditorClient initialData={initialData} />
}
