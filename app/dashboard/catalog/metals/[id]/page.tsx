import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { MetalForm } from '../metal-form'
import type { MetalItem } from '../metals-client'
import { loadCatalogMetal } from '@/lib/catalog-metal-save'

async function getMetal(id: string): Promise<MetalItem | null> {
  const adminClient = createSupabaseAdminClient()
  return await loadCatalogMetal(adminClient,id) as MetalItem|null
}

export default async function EditMetalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getMetal(id)
  if (!item) notFound()
  return <MetalForm mode="edit" initialItem={item} />
}
