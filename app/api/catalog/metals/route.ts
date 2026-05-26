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

function duplicateMetalError(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (error?.code !== '23505' && !error?.message?.includes('duplicate key value')) return null
  if (error.message?.includes('catalog_metals_name_key')) return 'A metal with this name already exists. Use a unique Metal Name, for example "12K Yellow" if you need a separate sellable option.'
  if (error.message?.includes('catalog_metals_slug_key')) return 'A metal with this slug already exists. Use a unique slug.'
  return 'This metal already exists. Please use a unique name and slug.'
}

function buildMetalWriteFields(body: MetalPayload) {
  const displayLabel = resolveDisplayLabel(body)
  const isCombined = Boolean(body.is_combined_option)
  const baseMetalName = body.base_metal_name?.trim() || (isCombined ? body.name.trim() : null)

  return {
    name: isCombined ? displayLabel : body.name.trim(),
    slug: body.slug.trim(),
    purity_label: body.purity_label?.trim() || null,
    base_metal_name: baseMetalName,
    display_label: displayLabel,
    is_combined_option: isCombined,
    color_hex: body.color_hex?.trim() || null,
    composition_description: body.composition_description?.trim() || null,
    display_order: Number(body.display_order ?? 0),
    status: body.status || 'active',
  }
}

async function loadCompositionParts(adminClient: any, metalIds: string[]) {
  if (!metalIds.length) return new Map()
  const partsResult = await adminClient
    .from('metal_composition_parts')
    .select('*')
    .in('metal_id', metalIds)
    .order('sort_order', { ascending: true })
  if (partsResult.error) throw new Error(partsResult.error.message)

  const partsByMetal = new Map<string, any[]>()
  for (const part of partsResult.data ?? []) {
    const current = partsByMetal.get(part.metal_id) ?? []
    current.push(part)
    partsByMetal.set(part.metal_id, current)
  }
  return partsByMetal
}

async function syncCompositionParts(adminClient: any, metalId: string, compositionParts: MetalPayload['composition_parts'] = []) {
  const existingPartsResult = await adminClient
    .from('metal_composition_parts')
    .select('id')
    .eq('metal_id', metalId)
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

  const partIdsToDelete = (existingPartsResult.data ?? []).map((row: any) => Number(row.id)).filter((id: number) => !keptPartIds.has(id))
  if (partIdsToDelete.length) {
    const { error } = await adminClient.from('metal_composition_parts').delete().in('id', partIdsToDelete)
    if (error) throw new Error(error.message)
  }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('catalog_metals')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const partsByMetal = await loadCompositionParts(access.adminClient, (data ?? []).map((row: any) => row.id))
  return NextResponse.json({
    items: (data ?? []).map((item: any) => ({
      ...item,
      composition_parts: partsByMetal.get(item.id) ?? [],
    })),
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as MetalPayload | null
  if (!body?.name?.trim() || !body?.slug?.trim()) {
    return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_metals')
    .insert(buildMetalWriteFields(body))
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: duplicateMetalError(error) ?? error.message }, { status: duplicateMetalError(error) ? 409 : 500 })
  await syncCompositionParts(access.adminClient, data.id, body.composition_parts)
  const partsByMetal = await loadCompositionParts(access.adminClient, [data.id])
  return NextResponse.json({ item: { ...data, composition_parts: partsByMetal.get(data.id) ?? [] } })
}
