import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { buildCombinedMetalDisplayLabel } from '@/lib/product-metal-variants'

type MetalPayload = {
  name: string
  slug: string
  purity_label?: string | null
  base_metal_name?: string | null
  display_label?: string | null
  is_combined_option?: boolean
  color_hex?: string | null
  composition_description?: string | null
  display_order?: number
  status?: string
  composition_parts?: {
    id?: number
    part_name: string
    percentage: number
    color_hex?: string | null
    sort_order?: number
  }[]
}

function resolveDisplayLabel(body: MetalPayload) {
  return buildCombinedMetalDisplayLabel({
    name: body.name?.trim() || '',
    display_label: body.display_label?.trim() || null,
    purity_label: body.purity_label?.trim() || null,
    base_metal_name: body.base_metal_name?.trim() || body.name?.trim() || null,
  })
}

async function loadCompositionParts(adminClient: any, metalId: string) {
  const partsResult = await adminClient
    .from('metal_composition_parts')
    .select('*')
    .eq('metal_id', metalId)
    .order('sort_order', { ascending: true })
  if (partsResult.error) throw new Error(partsResult.error.message)
  return partsResult.data ?? []
}

async function syncCompositionParts(adminClient: any, metalId: string, compositionParts: MetalPayload['composition_parts'] = []) {
  const existingPartsResult = await adminClient.from('metal_composition_parts').select('id').eq('metal_id', metalId)
  if (existingPartsResult.error) throw new Error(existingPartsResult.error.message)

  const keptPartIds = new Set<number>()
  const nextParts = (compositionParts ?? []).filter((part) => part.part_name?.trim())

  for (const [index, part] of nextParts.entries()) {
    const payload = {
      metal_id: metalId,
      part_name: part.part_name.trim(),
      percentage: Number(part.percentage ?? 0),
      color_hex: part.color_hex?.trim() || null,
      sort_order: Number(part.sort_order ?? index + 1),
    }

    if (part.id) {
      const { error } = await adminClient.from('metal_composition_parts').update(payload).eq('id', part.id)
      if (error) throw new Error(error.message)
      keptPartIds.add(Number(part.id))
    } else {
      const { data, error } = await adminClient.from('metal_composition_parts').insert(payload).select('id').single()
      if (error) throw new Error(error.message)
      keptPartIds.add(Number(data.id))
    }
  }

  const partIdsToDelete = (existingPartsResult.data ?? [])
    .map((row: any) => Number(row.id))
    .filter((id: number) => !keptPartIds.has(id))

  if (partIdsToDelete.length) {
    const { error } = await adminClient.from('metal_composition_parts').delete().in('id', partIdsToDelete)
    if (error) throw new Error(error.message)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = (await request.json().catch(() => null)) as MetalPayload | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const { data, error } = await access.adminClient
    .from('catalog_metals')
    .update({
      name: body.name?.trim(),
      slug: body.slug?.trim(),
      purity_label: body.purity_label?.trim() || null,
      base_metal_name: body.base_metal_name?.trim() || body.name?.trim() || null,
      display_label: resolveDisplayLabel(body),
      is_combined_option: Boolean(body.is_combined_option),
      color_hex: body.color_hex?.trim() || null,
      composition_description: body.composition_description?.trim() || null,
      display_order: Number(body.display_order ?? 0),
      status: body.status || 'active',
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncCompositionParts(access.adminClient, id, body.composition_parts)
  const composition_parts = await loadCompositionParts(access.adminClient, id)
  return NextResponse.json({ item: { ...data, composition_parts } })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const { error } = await access.adminClient.from('catalog_metals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
