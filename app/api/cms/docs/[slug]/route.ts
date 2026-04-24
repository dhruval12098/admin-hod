import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const dynamic = 'force-dynamic'

async function isAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice('Bearer '.length).trim()
  if (!supabaseUrl || !supabaseServiceRoleKey || !token) return false

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  return profile?.role === 'admin'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars.' }, { status: 500 })
  }

  const { slug } = await params
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const { data: page, error: pageError } = await supabase
    .from('docs_pages')
    .select('id, slug, title, eyebrow, subtitle')
    .eq('slug', slug)
    .maybeSingle()

  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })

  const { data: blocks, error: blocksError } = await supabase
    .from('docs_blocks')
    .select('id, sort_order, heading, description, body')
    .eq('page_id', page?.id ?? 0)
    .order('sort_order', { ascending: true })

  if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 })
  return NextResponse.json({ page: page ?? null, blocks: blocks ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars.' }, { status: 500 })
  }

  const { slug } = await params
  const body = await request.json()
  const payload = {
    slug,
    title: String(body.title ?? '').trim(),
    eyebrow: String(body.eyebrow ?? '').trim(),
    subtitle: String(body.subtitle ?? '').trim(),
    updated_at: new Date().toISOString(),
  }
  const blocks = Array.isArray(body.blocks) ? body.blocks : []

  if (!payload.title || !payload.eyebrow || !payload.subtitle) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const { data: pageData, error: pageError } = await supabase
    .from('docs_pages')
    .upsert(payload, { onConflict: 'slug' })
    .select('id, slug, title, eyebrow, subtitle')
    .maybeSingle()

  if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })

  if (pageData?.id) {
    const normalizedBlocks = blocks
      .map((block: { sort_order?: unknown; heading?: unknown; description?: unknown; body?: unknown }) => ({
        page_id: pageData.id,
        sort_order: Number(block.sort_order) || 1,
        heading: String(block.heading ?? '').trim(),
        description: String(block.description ?? '').trim(),
        body: String(block.body ?? '').trim(),
      }))
      .filter((block: { heading: string; description: string }) => block.heading && block.description)

    const { error: deleteError } = await supabase.from('docs_blocks').delete().eq('page_id', pageData.id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    if (normalizedBlocks.length) {
      const { error: insertError } = await supabase.from('docs_blocks').insert(normalizedBlocks)
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, data: pageData })
}
