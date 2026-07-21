import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import type { CatalogGstSlab } from '@/lib/product-catalog'
import { SettingsClient, type SettingsPageData } from './settings-client'

async function getSettingsPageData(): Promise<SettingsPageData> {
  const adminClient = createSupabaseAdminClient()

  const [settingsResult, gstResult] = await Promise.all([
    adminClient
      .from('site_settings')
      .select('*')
      .eq('settings_key', 'global_site_settings')
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('catalog_gst_slabs')
      .select('*')
      .order('display_order', { ascending: true }),
  ])

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message)
  }

  if (gstResult.error) {
    throw new Error(gstResult.error.message)
  }

  return {
    settings: {
      whatsapp_number: settingsResult.data?.whatsapp_number ?? '',
      default_gst_slab_id: settingsResult.data?.default_gst_slab_id ?? '',
      maintenance_mode_enabled: Boolean(settingsResult.data?.maintenance_mode_enabled),
      maintenance_mode_message: settingsResult.data?.maintenance_mode_message ?? '',
    },
    gstSlabs: (gstResult.data ?? []) as CatalogGstSlab[],
  }
}

export default async function SettingsPage() {
  const initialData = await getSettingsPageData()
  return <SettingsClient initialData={initialData} />
}
