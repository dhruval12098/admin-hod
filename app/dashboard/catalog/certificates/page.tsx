import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CertificatesClient, type CertificateItem } from './certificates-client'

async function getCertificates(): Promise<CertificateItem[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('catalog_certificates')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CertificateItem[]
}

export default async function CertificatesPage() {
  const initialItems = await getCertificates()
  return <CertificatesClient initialItems={initialItems} />
}
