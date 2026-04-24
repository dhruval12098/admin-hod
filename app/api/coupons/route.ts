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
    .select('id, code, title, discount_type, discount_value, usage_limit, usage_count, is_active, created_at')
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
  const discountType = body.discount_type === 'fixed' ? 'fixed' : 'percentage'
  const discountValue = Number(body.discount_value)
  const usageLimit = body.usage_limit == null || body.usage_limit === '' ? null : Number(body.usage_limit)
  const isActive = Boolean(body.is_active)

  if (!code || !Number.isFinite(discountValue) || discountValue < 0) {
    return NextResponse.json({ error: 'Coupon code and discount value are required.' }, { status: 400 })
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
