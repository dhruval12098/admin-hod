import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionId = 1

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const [{ data: section, error: sectionError }, { data: blocks, error: blocksError }] = await Promise.all([
    access.adminClient
      .from('service_banner_section')
      .select('id, image_path, image_alt, is_enabled')
      .eq('id', sectionId)
      .maybeSingle(),
    access.adminClient
      .from('service_banner_blocks')
      .select('id, title, paragraph, sort_order, is_active')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })
  if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 })

  const resolvedSection = section ?? { id: sectionId, image_path: null, image_alt: null, is_enabled: true }
  const imageUrl = resolvedSection.image_path
    ? access.adminClient.storage.from(process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod').getPublicUrl(resolvedSection.image_path).data.publicUrl
    : ''

  return NextResponse.json({ section: { ...resolvedSection, image_url: imageUrl }, blocks: blocks ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null) as {
    section?: { image_path?: unknown; image_alt?: unknown; is_enabled?: unknown }
    blocks?: Array<{ title?: unknown; paragraph?: unknown; sort_order?: unknown; is_active?: unknown }>
  } | null

  if (!body?.section || !Array.isArray(body.blocks)) {
    return NextResponse.json({ error: 'Invalid service banner payload.' }, { status: 400 })
  }

  const imagePath = typeof body.section.image_path === 'string' ? body.section.image_path.trim() : ''
  const imageAlt = typeof body.section.image_alt === 'string' ? body.section.image_alt.trim() : ''
  const blocks = body.blocks
    .map((block, index) => ({
      title: typeof block.title === 'string' ? block.title.trim() : '',
      paragraph: typeof block.paragraph === 'string' ? block.paragraph.trim() : '',
      sort_order: Number.isFinite(Number(block.sort_order)) ? Math.max(0, Number(block.sort_order)) : index + 1,
      is_active: block.is_active !== false,
    }))
    .filter((block) => block.title && block.paragraph)

  if (body.section.is_enabled !== false && (!imagePath || blocks.length === 0)) {
    return NextResponse.json({ error: 'An enabled section requires a banner image and at least one complete block.' }, { status: 400 })
  }

  const { error: sectionError } = await access.adminClient
    .from('service_banner_section')
    .upsert({ id: sectionId, image_path: imagePath || null, image_alt: imageAlt || null, is_enabled: body.section.is_enabled !== false }, { onConflict: 'id' })

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  const { error: deleteError } = await access.adminClient.from('service_banner_blocks').delete().gte('sort_order', 0)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (blocks.length > 0) {
    const { error: insertError } = await access.adminClient.from('service_banner_blocks').insert(blocks)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}