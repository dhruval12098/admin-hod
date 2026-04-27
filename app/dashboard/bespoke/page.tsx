import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  BespokeClient,
  type BespokePageData,
} from './bespoke-client'

async function getBespokePageData(): Promise<BespokePageData> {
  const adminClient = createSupabaseAdminClient()

  const [submissionsResult, heroSectionResult, heroItemsResult, categoriesResult, itemsResult, formSettingsResult, guaranteesResult, pieceTypesResult, stoneOptionsResult, caratOptionsResult, metalOptionsResult] = await Promise.all([
    adminClient.from('bespoke_submissions').select('*').order('created_at', { ascending: false }),
    adminClient.from('bespoke_hero_content').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    adminClient.from('bespoke_hero_slider_items').select('*').order('sort_order', { ascending: true }),
    adminClient.from('bespoke_portfolio_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_portfolio_items').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_form_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    adminClient.from('bespoke_form_guarantees').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_form_piece_types').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_form_stone_options').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_form_carat_options').select('*').order('display_order', { ascending: true }),
    adminClient.from('bespoke_form_metal_options').select('*').order('display_order', { ascending: true }),
  ])

  return {
    hero: heroSectionResult.error
      ? { heading_line_1: '', status: 'active' }
      : { ...(heroSectionResult.data ?? { heading_line_1: '', status: 'active' }), items: heroItemsResult.error ? [] : (heroItemsResult.data ?? []) },
    categories: categoriesResult.error ? [] : (categoriesResult.data ?? []),
    items: itemsResult.error ? [] : (itemsResult.data ?? []),
    formConfig: {
      settings: formSettingsResult.error ? { intro_heading: '', intro_subtitle: '', footer_note: '', status: 'active' } : (formSettingsResult.data ?? { intro_heading: '', intro_subtitle: '', footer_note: '', status: 'active' }),
      guarantees: guaranteesResult.error ? [] : (guaranteesResult.data ?? []),
      pieceTypes: pieceTypesResult.error ? [] : (pieceTypesResult.data ?? []),
      stoneOptions: stoneOptionsResult.error ? [] : (stoneOptionsResult.data ?? []),
      caratOptions: caratOptionsResult.error ? [] : (caratOptionsResult.data ?? []),
      metalOptions: metalOptionsResult.error ? [] : (metalOptionsResult.data ?? []),
    },
    submissions: submissionsResult.error ? [] : (submissionsResult.data ?? []),
  }
}

export default async function BespokeAdminPage() {
  const initialData = await getBespokePageData()
  return <BespokeClient initialData={initialData} />
}
