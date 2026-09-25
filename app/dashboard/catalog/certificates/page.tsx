import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCatalogMasterList } from '@/lib/catalog-master-save'
import { CertificatesClient, type CertificateItem } from './certificates-client'

async function getCertificates(): Promise<CertificateItem[]> {
  const adminClient = createSupabaseAdminClient()
  return await loadCatalogMasterList(adminClient, 'certificate') as CertificateItem[]
}

export default async function CertificatesPage() {
  const initialItems = await getCertificates()
  return <CertificatesClient initialItems={initialItems} />
}
