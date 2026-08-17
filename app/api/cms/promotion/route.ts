import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('promotion_popup')
    .select('*')
    .eq('section_key', 'global_promotion_popup')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const payload = {
    section_key: 'global_promotion_popup',
    label: typeof body.label === 'string' ? body.label : '',
    title: typeof body.title === 'string' ? body.title : '',
    description: typeof body.description === 'string' ? body.description : '',
    cta_text: typeof body.cta_text === 'string' ? body.cta_text : '',
    cta_link: typeof body.cta_link === 'string' ? body.cta_link : '',
    cta_action: body.cta_action === 'reveal_coupon' ? 'reveal_coupon' : 'redirect',
    selected_coupon_id: body.cta_action === 'reveal_coupon' && body.selected_coupon_id != null && Number.isInteger(Number(body.selected_coupon_id)) && Number(body.selected_coupon_id) > 0
      ? Number(body.selected_coupon_id)
      : null,
    image_path: typeof body.image_path === 'string' ? body.image_path : '',
    mobile_image_path: typeof body.mobile_image_path === 'string' ? body.mobile_image_path : '',
    image_alt: typeof body.image_alt === 'string' ? body.image_alt : '',
    image_only_mode: Boolean(body.image_only_mode),
    is_active: Boolean(body.is_active),
    show_once_per_session: body.show_once_per_session !== false,
  }

  if (payload.cta_action === 'redirect' && !payload.cta_link.trim()) {
    return NextResponse.json({ error: 'A destination link is required for Redirect mode.' }, { status: 400 })
  }

  if (payload.cta_action === 'reveal_coupon') {
    if (payload.selected_coupon_id == null) {
      return NextResponse.json({ error: 'Select an active coupon for Reveal coupon mode.' }, { status: 400 })
    }
    const { data: coupon, error: couponError } = await access.adminClient
      .from('coupons')
      .select('id, usage_limit, usage_count')
      .eq('id', payload.selected_coupon_id)
      .eq('is_active', true)
      .maybeSingle()
    if (couponError || !coupon || (coupon.usage_limit != null && Number(coupon.usage_count ?? 0) >= Number(coupon.usage_limit))) {
      return NextResponse.json({ error: 'The selected coupon is unavailable or has reached its usage limit.' }, { status: 400 })
    }
  }

  const { error } = await access.adminClient
    .from('promotion_popup')
    .upsert(payload, { onConflict: 'section_key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
