import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { MetalForm } from '../metal-form'
import type { MetalItem } from '../metals-client'

async function getMetal(id: string): Promise<MetalItem | null> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient.from('catalog_metals').select('*').eq('id', id).single()
  if (error || !data) return null

  const { data: parts } = await adminClient
    .from('metal_composition_parts')
    .select('*')
    .eq('metal_id', id)
    .order('sort_order', { ascending: true })

  return {
    ...(data as MetalItem),
    composition_parts: (parts ?? []) as MetalItem['composition_parts'],
  }
}

export default async function EditMetalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getMetal(id)
  if (!item) notFound()
  return <MetalForm mode="edit" initialItem={item} />
}
