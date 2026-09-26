import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  BespokeClient,
  type BespokePageData,
} from './bespoke-client'
import { loadBespokeHeroSnapshot } from '@/lib/bespoke-hero-save'
import { loadBespokeFormSnapshot } from '@/lib/bespoke-form-save'

async function getBespokePageData(): Promise<BespokePageData> {
  const adminClient = createSupabaseAdminClient()

  const [submissionsResult, heroSnapshot, categoriesResult, itemsResult, processItemsResult, formSnapshot] = await Promise.all([
    adminClient.from('bespoke_submissions').select('*').order('created_at', { ascending: false }),
    loadBespokeHeroSnapshot(adminClient),
    adminClient.from('bespoke_portfolio_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_portfolio_items').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_process_cards').select('*').order('sort_order', { ascending: true }),
    loadBespokeFormSnapshot(adminClient),
  ])

  return {
    hero: { ...(heroSnapshot.item ?? { heading_line_1: '', slider_enabled: false, status: 'active' as const }), items: heroSnapshot.items },
    heroRevision: heroSnapshot.revision,
    categories: categoriesResult.error ? [] : (categoriesResult.data ?? []),
    items: itemsResult.error ? [] : (itemsResult.data ?? []),
    processItems: processItemsResult.error ? [] : (processItemsResult.data ?? []),
    formConfig: formSnapshot,
    submissions: submissionsResult.error ? [] : (submissionsResult.data ?? []),
  }
}

export default async function BespokeAdminPage() {
  const initialData = await getBespokePageData()
  return <BespokeClient initialData={initialData} />
}
