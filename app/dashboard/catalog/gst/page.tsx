import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCatalogMasterList } from '@/lib/catalog-master-save'
import type { CatalogGstSlab } from '@/lib/product-catalog'
import { GstClient } from './gst-client'

async function getGstSlabs(): Promise<CatalogGstSlab[]> {
  const adminClient = createSupabaseAdminClient()
  return await loadCatalogMasterList(adminClient, 'gst_slab') as CatalogGstSlab[]
}

export default async function GstPage() {
  const initialItems = await getGstSlabs()
  return <GstClient initialItems={initialItems} />
}
