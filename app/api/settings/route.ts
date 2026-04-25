import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const settingsKey = 'global_site_settings'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('site_settings')
    .select('settings_key, whatsapp_number')
    .eq('settings_key', settingsKey)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    item: {
      settings_key: settingsKey,
      whatsapp_number: data?.whatsapp_number ?? '',
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
  }

  const { error } = await access.adminClient
    .from('site_settings')
    .upsert(payload, { onConflict: 'settings_key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
