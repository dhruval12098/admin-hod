import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function buildAuthClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

function buildAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

async function assertAdmin(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }) }
  }

  const accessToken = authHeader.slice('Bearer '.length)
  const authClient = buildAuthClient(accessToken)
  const adminClient = buildAdminClient()

  if (!authClient || !adminClient) {
    return { error: NextResponse.json({ error: 'Missing Supabase env vars.' }, { status: 500 }) }
  }

  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return { adminClient }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { adminClient } = access
  const { data, error } = await adminClient
    .from('coupons')
    .select('id, code, title, discount_type, discount_value, reward_type, minimum_order_amount, gift_product_id, gift_variant_data, gift_banner_image_url, banner_enabled, banner_title, banner_description, starts_at, ends_at, featured_priority, usage_limit, usage_count, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body.code !== 'string' || typeof body.discount_type !== 'string') {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const code = body.code.trim().toUpperCase()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const rewardType = body.reward_type === 'free_gift' ? 'free_gift' : body.reward_type === 'fixed' ? 'fixed' : 'percentage'
  const discountType = rewardType === 'fixed' ? 'fixed' : 'percentage'
  const discountValue = rewardType === 'free_gift' ? 0 : Number(body.discount_value)
  const minimumOrderAmount = Number(body.minimum_order_amount ?? 0)
  const usageLimit = body.usage_limit == null || body.usage_limit === '' ? null : Number(body.usage_limit)
  const isActive = Boolean(body.is_active)

  if (!code || !Number.isFinite(discountValue) || discountValue < 0) {
    return NextResponse.json({ error: 'Coupon code and discount value are required.' }, { status: 400 })
  }

  if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
    return NextResponse.json({ error: 'Minimum order amount must be zero or greater.' }, { status: 400 })
  }
  if (rewardType === 'percentage' && discountValue > 100) {
    return NextResponse.json({ error: 'Percentage discount cannot exceed 100%.' }, { status: 400 })
  }
  const giftProductId = rewardType === 'free_gift' && typeof body.gift_product_id === 'string' ? body.gift_product_id : null
  const giftVariantData = rewardType === 'free_gift' && body.gift_variant_data && typeof body.gift_variant_data === 'object' ? body.gift_variant_data : {}
  if (rewardType === 'free_gift' && (!giftProductId || minimumOrderAmount <= 0)) {
    return NextResponse.json({ error: 'Free-gift coupons require a product and a minimum order amount.' }, { status: 400 })
  }
  if (giftProductId) {
    const { data: giftProduct } = await access.adminClient.from('products').select('id, status, stock_quantity').eq('id', giftProductId).maybeSingle()
    if (!giftProduct || giftProduct.status !== 'active' || Number(giftProduct.stock_quantity ?? 0) < 1) {
      return NextResponse.json({ error: 'The selected gift product must be active and in stock.' }, { status: 400 })
    }
    const variantId = typeof giftVariantData.variant_id === 'string' ? giftVariantData.variant_id : null
    const { count: variantCount, error: variantCountError } = await access.adminClient.from('product_metal_variants').select('id', { count: 'exact', head: true }).eq('product_id', giftProductId)
    if (variantCountError) return NextResponse.json({ error: variantCountError.message }, { status: 500 })
    if ((variantCount ?? 0) > 0 && !variantId) return NextResponse.json({ error: 'Select the exact gift variant.' }, { status: 400 })
    if (variantId) {
      const { data: variant } = await access.adminClient.from('product_metal_variants').select('id').eq('id', variantId).eq('product_id', giftProductId).maybeSingle()
      if (!variant) return NextResponse.json({ error: 'The selected gift variant does not belong to this product.' }, { status: 400 })
    }
  }

  if (usageLimit != null && (!Number.isFinite(usageLimit) || usageLimit < 1)) {
    return NextResponse.json({ error: 'Usage limit must be at least 1.' }, { status: 400 })
  }

  const { adminClient } = access
  const payload = {
    code,
    title,
    discount_type: discountType,
    discount_value: discountValue,
    reward_type: rewardType,
    minimum_order_amount: minimumOrderAmount,
    gift_product_id: giftProductId,
    gift_variant_data: giftVariantData,
    gift_banner_image_url: typeof body.gift_banner_image_url === 'string' ? body.gift_banner_image_url.trim() || null : null,
    banner_enabled: Boolean(body.banner_enabled),
    banner_title: typeof body.banner_title === 'string' ? body.banner_title.trim() || null : null,
    banner_description: typeof body.banner_description === 'string' ? body.banner_description.trim() || null : null,
    starts_at: typeof body.starts_at === 'string' && body.starts_at ? new Date(body.starts_at).toISOString() : null,
    ends_at: typeof body.ends_at === 'string' && body.ends_at ? new Date(body.ends_at).toISOString() : null,
    featured_priority: Math.max(0, Number(body.featured_priority ?? 0) || 0),
    usage_limit: usageLimit,
    is_active: isActive,
  }

  let result
  if (body.id) {
    result = await adminClient.from('coupons').update(payload).eq('id', body.id).select('id').single()
  } else {
    result = await adminClient.from('coupons').insert(payload).select('id').single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: result.data?.id ?? null })
}
