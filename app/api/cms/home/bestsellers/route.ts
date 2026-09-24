import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { readHomeGroup1Envelope, saveHomeGroup1 } from '@/lib/cms-home-group1-save'

type Override = { id?: string; product_id: string; display_title?: string; display_image_path?: string }
type Payload = Record<string, unknown> & {
  eyebrow: string; heading: string; cta_label: string; cta_href: string
  selected_product_ids: string[]; selected_products?: Override[]
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.rpc('cms_home_group1_snapshot_v1', { p_kind: 'bestsellers' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null) as Payload | null
  if (!body || typeof body.eyebrow !== 'string' || typeof body.heading !== 'string'
    || typeof body.cta_label !== 'string' || typeof body.cta_href !== 'string'
    || !Array.isArray(body.selected_product_ids) || !body.selected_product_ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }
  const envelope = readHomeGroup1Envelope(body)
  if (!envelope) return NextResponse.json({ error: 'This editor is out of date. Reload it before saving.' }, { status: 409 })
  const overrides = Array.isArray(body.selected_products) ? body.selected_products : []
  if (!overrides.every((item) => item && typeof item.product_id === 'string'
    && (typeof item.id === 'undefined' || /^[0-9a-f-]{36}$/i.test(item.id))
    && (typeof item.display_title === 'undefined' || typeof item.display_title === 'string')
    && (typeof item.display_image_path === 'undefined' || typeof item.display_image_path === 'string'))) {
    return NextResponse.json({ error: 'Invalid bestseller card.' }, { status: 400 })
  }
  if (new Set(body.selected_product_ids).size !== body.selected_product_ids.length) {
    return NextResponse.json({ error: 'A product can be selected only once.' }, { status: 400 })
  }
  const overrideByProduct = new Map(overrides.map((item) => [item.product_id, item]))
  const items = body.selected_product_ids.map((productId) => {
    const item = overrideByProduct.get(productId)
    return {
      ...(item?.id ? { id: item.id } : {}), product_id: productId,
      display_title: item?.display_title?.trim() ?? '', display_image_path: item?.display_image_path?.trim() ?? '',
    }
  })
  return saveHomeGroup1(access, 'bestsellers', envelope, {
    eyebrow: body.eyebrow.trim(), heading: body.heading.trim(),
    cta_label: body.cta_label.trim(), cta_href: body.cta_href.trim(),
  }, items)
}
