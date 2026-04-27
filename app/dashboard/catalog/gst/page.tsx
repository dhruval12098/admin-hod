import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { CatalogGstSlab } from '@/lib/product-catalog'
import { GstClient } from './gst-client'

async function getGstSlabs(): Promise<CatalogGstSlab[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('catalog_gst_slabs')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CatalogGstSlab[]
}

export default async function GstPage() {
  const initialItems = await getGstSlabs()
  return <GstClient initialItems={initialItems} />
}
