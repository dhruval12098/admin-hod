import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { settingsDatabaseError, siteSettingsSchema } from '@/lib/settings-validation'

const settingsKey = 'global_site_settings'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('site_settings')
    .select('whatsapp_number, default_gst_slab_id, maintenance_mode_enabled, maintenance_mode_message')
    .eq('settings_key', settingsKey)
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load settings.' }, { status: 500 })

  return NextResponse.json({
    item: {
      settings_key: settingsKey,
      whatsapp_number: data?.whatsapp_number ?? '',
      default_gst_slab_id: data?.default_gst_slab_id ?? '',
      maintenance_mode_enabled: Boolean(data?.maintenance_mode_enabled),
      maintenance_mode_message: data?.maintenance_mode_message ?? '',
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const parsed = siteSettingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid settings details.' }, { status: 400 })

  if (parsed.data.default_gst_slab_id) {
    const { data: slab, error } = await access.adminClient
      .from('catalog_gst_slabs')
      .select('id, status')
      .eq('id', parsed.data.default_gst_slab_id)
      .maybeSingle()
    if (error) {
      const safe = settingsDatabaseError(error)
      return NextResponse.json({ error: safe.message }, { status: safe.status })
    }
    if (!slab || slab.status === 'hidden') return NextResponse.json({ error: 'Select an active GST slab.' }, { status: 400 })
  }

  const payload = { settings_key: settingsKey, ...parsed.data }
  const updateResult = await access.adminClient.from('site_settings').update(payload).eq('settings_key', settingsKey).select('settings_key').limit(1)
  if (updateResult.error) {
    const safe = settingsDatabaseError(updateResult.error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
  if (!updateResult.data?.length) {
    const insertResult = await access.adminClient.from('site_settings').insert(payload)
    if (insertResult.error) {
      const safe = settingsDatabaseError(insertResult.error)
      return NextResponse.json({ error: safe.message }, { status: safe.status })
    }
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
