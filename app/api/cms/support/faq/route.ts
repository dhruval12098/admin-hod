import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sectionKey = 'global_support_faq'

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

  const { data: section, error: sectionError } = await adminClient
    .from('support_faq_section')
    .select('id, section_key, title, subtitle')
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  if (!section) {
    return NextResponse.json({
      section: { section_key: sectionKey, title: 'Frequently Asked Questions', subtitle: '' },
      items: [],
    })
  }

  const { data: items, error: itemsError } = await adminClient
    .from('support_faq_items')
    .select('id, sort_order, question, answer, is_active, category_id, catalog_category_id')
    .eq('section_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  const [{ data: categories, error: categoriesError }, { data: catalogCategories, error: catalogError }] = await Promise.all([
    adminClient
      .from('support_faq_categories')
      .select('id, name, slug, description, image_path, image_alt, sort_order, is_active')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('catalog_categories')
      .select('id, name, slug')
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
  ])

  if (categoriesError) return NextResponse.json({ error: categoriesError.message }, { status: 500 })
  if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 500 })
  return NextResponse.json({ section, items: items ?? [], categories: categories ?? [], catalogCategories: catalogCategories ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { adminClient } = access

  const body = await request.json().catch(() => null)
  if (!body || typeof body.section?.title !== 'string' || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const { data: section, error: sectionError } = await adminClient
    .from('support_faq_section')
    .upsert(
      {
        section_key: sectionKey,
        title: body.section.title,
        subtitle: typeof body.section.subtitle === 'string' ? body.section.subtitle : '',
      },
      { onConflict: 'section_key' }
    )
    .select('id')
    .single()

  if (sectionError || !section) {
    return NextResponse.json({ error: sectionError?.message ?? 'Unable to save FAQ section.' }, { status: 500 })
  }

  const { error: deleteError } = await adminClient
    .from('support_faq_items')
    .delete()
    .eq('section_id', section.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const rows = body.items
    .filter((item: { question?: unknown; answer?: unknown }) => typeof item.question === 'string' && typeof item.answer === 'string')
    .map((item: { sort_order?: unknown; question: string; answer: string; is_active?: unknown; category_id?: unknown; catalog_category_id?: unknown }, index: number) => ({
      section_id: section.id,
      category_id: Number.isSafeInteger(Number(item.category_id)) && Number(item.category_id) > 0 ? Number(item.category_id) : null,
      catalog_category_id: typeof item.catalog_category_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.catalog_category_id) ? item.catalog_category_id : null,
      sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
      question: item.question,
      answer: item.answer,
      is_active: typeof item.is_active === 'boolean' ? item.is_active : true,
    }))

  if (rows.length > 0) {
    const { error: insertError } = await adminClient.from('support_faq_items').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}


