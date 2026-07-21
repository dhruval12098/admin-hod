import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const settingsKey = 'global_site_settings'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('site_settings')
    .select('*')
    .eq('settings_key', settingsKey)
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    item: {
      settings_key: settingsKey,
      whatsapp_number: data?.whatsapp_number ?? '',
      default_gst_slab_id: data?.default_gst_slab_id ?? '',
      maintenance_mode_enabled: Boolean(data?.maintenance_mode_enabled),
      maintenance_mode_message: data?.maintenance_mode_message ?? '',
    },
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const payload = {
    settings_key: settingsKey,
    whatsapp_number: typeof body.whatsapp_number === 'string' ? body.whatsapp_number.trim() : '',
    default_gst_slab_id: typeof body.default_gst_slab_id === 'string' && body.default_gst_slab_id.trim().length > 0
      ? body.default_gst_slab_id.trim()
      : null,
    maintenance_mode_enabled: Boolean(body.maintenance_mode_enabled),
    maintenance_mode_message: typeof body.maintenance_mode_message === 'string' && body.maintenance_mode_message.trim().length > 0
      ? body.maintenance_mode_message.trim()
      : 'Our atelier is receiving a careful polish. House of Diams will be back online shortly.',
  }

  const updateResult = await access.adminClient
    .from('site_settings')
    .update(payload)
    .eq('settings_key', settingsKey)
    .select('settings_key')
    .limit(1)

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message }, { status: 500 })
  }

  if (!updateResult.data?.length) {
    const insertResult = await access.adminClient
      .from('site_settings')
      .insert(payload)

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
