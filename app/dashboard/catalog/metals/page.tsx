import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { MetalsClient, type MetalItem } from './metals-client'

async function getMetals(): Promise<MetalItem[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('catalog_metals')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MetalItem[]
}

export default async function MetalsPage() {
  const initialItems = await getMetals()
  return <MetalsClient initialItems={initialItems} />
}
