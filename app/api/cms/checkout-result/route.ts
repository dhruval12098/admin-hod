import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertAdmin } from '@/lib/cms-auth'

const states = ['success', 'pending', 'failed', 'error'] as const
const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'

function imageUrl(client: SupabaseClient, path: string | null) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const [{ data: page, error: pageError }, { data: stateRows, error: statesError }] = await Promise.all([
    access.adminClient.from('checkout_result_page').select('*').eq('id', 1).maybeSingle(),
    access.adminClient.from('checkout_result_states').select('*'),
  ])
  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })
  if (statesError) return NextResponse.json({ error: statesError.message }, { status: 500 })
  return NextResponse.json({ page: page ? { ...page, main_banner_image_url: imageUrl(access.adminClient, page.main_banner_image_path), secondary_banner_image_url: imageUrl(access.adminClient, page.secondary_banner_image_path) } : null, states: stateRows ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null) as { page?: Record<string, unknown>; states?: Array<Record<string, unknown>> } | null
  if (!body?.page || !Array.isArray(body.states)) return NextResponse.json({ error: 'Invalid checkout result payload.' }, { status: 400 })
  const clean = (value: unknown) => typeof value === 'string' ? value.trim() || null : null
  const page = { id: 1, main_banner_image_path: clean(body.page.main_banner_image_path), main_banner_image_alt: clean(body.page.main_banner_image_alt), secondary_banner_image_path: clean(body.page.secondary_banner_image_path), secondary_banner_image_alt: clean(body.page.secondary_banner_image_alt), secondary_eyebrow: clean(body.page.secondary_eyebrow), secondary_heading: clean(body.page.secondary_heading), secondary_paragraph: clean(body.page.secondary_paragraph), is_enabled: body.page.is_enabled !== false }
  const rows = states.map((state) => {
    const input = body.states?.find((entry) => entry.state === state) ?? {}
    return { state, eyebrow: clean(input.eyebrow), heading: clean(input.heading), paragraph: clean(input.paragraph), order_button_label: clean(input.order_button_label), is_enabled: input.is_enabled !== false }
  })
  const { error: pageError } = await access.adminClient.from('checkout_result_page').upsert(page, { onConflict: 'id' })
  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })
  const { error: statesError } = await access.adminClient.from('checkout_result_states').upsert(rows, { onConflict: 'state' })
  if (statesError) return NextResponse.json({ error: statesError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
