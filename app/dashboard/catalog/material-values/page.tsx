import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCatalogMasterList } from '@/lib/catalog-master-save'
import { MaterialValuesClient, type MaterialValueItem } from './material-values-client'

async function getMaterialValues(): Promise<MaterialValueItem[]> {
  const adminClient = createSupabaseAdminClient()
  return await loadCatalogMasterList(adminClient, 'material_value') as MaterialValueItem[]
}

export default async function MaterialValuesPage() {
  const initialItems = await getMaterialValues()
  return <MaterialValuesClient initialItems={initialItems} />
}
