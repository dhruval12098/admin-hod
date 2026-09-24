import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCmsContentListSnapshot } from '@/lib/cms-content-list-save'
import { BespokeProcessEditorClient, type BespokeProcessInitialData } from './bespoke-process-editor-client'

async function getBespokeProcessInitialData(): Promise<BespokeProcessInitialData> {
  const adminClient = createSupabaseAdminClient()
  const snapshot = await loadCmsContentListSnapshot(adminClient, 'bespoke_process')

  return {
    revision: snapshot.revision,
    items: snapshot.items.map((item) => ({ id: Number(item.id), sort_order: Number(item.sort_order), eyebrow: String(item.eyebrow ?? ''), title: String(item.title ?? ''), description: String(item.description ?? '') })),
  }
}

export default async function BespokeProcessPage() {
  const initialData = await getBespokeProcessInitialData()
  return <BespokeProcessEditorClient initialData={initialData} />
}
