import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const FORM_TABLES = [
  'bespoke_form_guarantees',
  'bespoke_form_piece_types',
  'bespoke_form_stone_options',
  'bespoke_form_carat_options',
  'bespoke_form_metal_options',
] as const

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const [settings, ...lists] = await Promise.all([
    access.adminClient.from('bespoke_form_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ...FORM_TABLES.map((table) => access.adminClient.from(table).select('*').order('display_order', { ascending: true })),
  ])

  const error = settings.error || lists.find((result) => result.error)?.error
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    settings: settings.data,
    guarantees: lists[0].data ?? [],
    pieceTypes: lists[1].data ?? [],
    stoneOptions: lists[2].data ?? [],
    caratOptions: lists[3].data ?? [],
    metalOptions: lists[4].data ?? [],
  })
}

export async function PUT(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const existing = await access.adminClient
    .from('bespoke_form_settings')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const settingsPayload = {
    intro_heading: body.settings?.intro_heading ?? null,
    intro_subtitle: body.settings?.intro_subtitle ?? null,
    footer_note: body.settings?.footer_note ?? null,
    status: body.settings?.status ?? 'active',
  }

  const settingsQuery = existing.data?.id
    ? access.adminClient.from('bespoke_form_settings').update(settingsPayload).eq('id', existing.data.id)
    : access.adminClient.from('bespoke_form_settings').insert(settingsPayload)

  const settingsResult = await settingsQuery.select('*').single()
  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 })
  }

  const listPayloads = [
    { table: 'bespoke_form_guarantees', items: body.guarantees ?? [] },
    { table: 'bespoke_form_piece_types', items: body.pieceTypes ?? [] },
    { table: 'bespoke_form_stone_options', items: body.stoneOptions ?? [] },
    { table: 'bespoke_form_carat_options', items: body.caratOptions ?? [] },
    { table: 'bespoke_form_metal_options', items: body.metalOptions ?? [] },
  ] as const

  for (const list of listPayloads) {
    const deleteResult = await access.adminClient.from(list.table).delete().not('id', 'is', null)
    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 500 })
    }

    if (list.items.length > 0) {
      const insertResult = await access.adminClient.from(list.table).insert(
        list.items
          .filter((item: any) => item.label?.trim())
          .map((item: any, index: number) => ({
            label: item.label,
            display_order: item.display_order ?? index + 1,
            status: item.status ?? 'active',
          }))
      )

      if (insertResult.error) {
        return NextResponse.json({ error: insertResult.error.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ item: settingsResult.data })
}
