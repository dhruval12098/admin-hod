import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type BestsellerSectionPayload = {
  eyebrow: string
  heading: string
  cta_label: string
  cta_href: string
  selected_product_ids: string[]
  selected_products?: Array<{ product_id: string; display_title?: string; display_image_path?: string }>
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access

  const [{ data: section, error: sectionError }, { data: links, error: linksError }] = await Promise.all([
    adminClient
      .from('cms_home_bestsellers')
      .select('id, eyebrow, heading, cta_label, cta_href, status')
      .eq('status', 'active')
      .maybeSingle(),
    adminClient
      .from('cms_home_bestseller_products')
      .select('section_id, product_id, display_order, display_title, display_image_path')
      .order('display_order', { ascending: true }),
  ])

  if (sectionError) {
    return NextResponse.json({ error: sectionError.message }, { status: 500 })
  }

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 })
  }

  const sectionLinks = (links ?? []).filter((item) => !section?.id || item.section_id === section.id)

  return NextResponse.json({
    section: section ?? {
      eyebrow: 'House of Diams',
      heading: 'Our Best Sellers',
      cta_label: 'View All Collection',
      cta_href: '/shop',
    },
    selected_product_ids: sectionLinks.map((item) => item.product_id),
    selected_products: sectionLinks.map((item) => ({
      product_id: item.product_id,
      display_order: item.display_order,
      display_title: item.display_title ?? '',
      display_image_path: item.display_image_path ?? '',
    })),
  })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = (await request.json().catch(() => null)) as BestsellerSectionPayload | null
  if (
    !body ||
    typeof body.eyebrow !== 'string' ||
    typeof body.heading !== 'string' ||
    typeof body.cta_label !== 'string' ||
    typeof body.cta_href !== 'string' ||
    !Array.isArray(body.selected_product_ids)
  ) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { adminClient } = access
  const { data: existingSection, error: existingSectionError } = await adminClient
    .from('cms_home_bestsellers')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existingSectionError) {
    return NextResponse.json({ error: existingSectionError.message }, { status: 500 })
  }

  const sectionPayload = {
    eyebrow: body.eyebrow,
    heading: body.heading,
    cta_label: body.cta_label,
    cta_href: body.cta_href,
    status: 'active',
    updated_at: new Date().toISOString(),
  }

  const sectionResult = existingSection?.id
    ? await adminClient.from('cms_home_bestsellers').update(sectionPayload).eq('id', existingSection.id).select('id').single()
    : await adminClient.from('cms_home_bestsellers').insert(sectionPayload).select('id').single()

  if (sectionResult.error || !sectionResult.data) {
    return NextResponse.json({ error: sectionResult.error?.message ?? 'Unable to save section.' }, { status: 500 })
  }
  const section = sectionResult.data

  const { error: deleteError } = await adminClient
    .from('cms_home_bestseller_products')
    .delete()
    .eq('section_id', section.id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (body.selected_product_ids.length > 0) {
    const overrideByProduct = new Map((body.selected_products ?? []).map((item) => [item.product_id, item]));
    const { error: insertError } = await adminClient.from('cms_home_bestseller_products').insert(
      body.selected_product_ids.map((productId, index) => {
        const override = overrideByProduct.get(productId);
        return {
          section_id: section.id,
          product_id: productId,
          display_order: index + 1,
          display_title: String(override?.display_title ?? '').trim() || null,
          display_image_path: String(override?.display_image_path ?? '').trim() || null,
        };
      })
    )

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
