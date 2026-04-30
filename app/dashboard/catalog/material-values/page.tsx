import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { MaterialValuesClient, type MaterialValueItem } from './material-values-client'

async function getMaterialValues(): Promise<MaterialValueItem[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('catalog_material_values')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MaterialValueItem[]
}

export default async function MaterialValuesPage() {
  const initialItems = await getMaterialValues()
  return <MaterialValuesClient initialItems={initialItems} />
}
