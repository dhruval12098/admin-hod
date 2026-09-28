import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadInventoryItems } from '@/lib/inventory-data'
import { InventoryClient, type InventoryItem } from './inventory-client'

async function getInventoryItems(): Promise<InventoryItem[]> {
  return loadInventoryItems(createSupabaseAdminClient()) as Promise<InventoryItem[]>
}

export default async function InventoryPage() {
  const initialItems = await getInventoryItems()
  return <InventoryClient initialItems={initialItems} />
}
