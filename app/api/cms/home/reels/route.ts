import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { canonicalizeInstagramUrl } from '@/lib/instagram-url'

const SECTION_KEY = 'home_instagram_reels'
const MAX_ITEMS = 30
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ReelInput = { id?: unknown; instagram_url?: unknown; title?: unknown; cover_image_url?: unknown; is_enabled?: unknown }

type ReelRow = {
  id?: string
  section_key: string
  instagram_url: string
  title: string
  cover_image_url: string | null
  display_order: number
  is_enabled: boolean
  created_by: string
}

function cleanCoverImageUrl(value: unknown) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new Error('Cover image must be a URL.')
  const next = value.trim()
  if (!next) return null
  if (next.length > 1000) throw new Error('Cover image URL is too long.')
  try {
    const url = new URL(next)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
    return url.toString()
  } catch {
    throw new Error('Cover image must be a valid public image URL.')
  }
}

async function loadItems(adminClient: { from: (table: string) => any }) {
  const query = adminClient
    .from('home_instagram_reels')
    .select('id, instagram_url, title, cover_image_url, display_order, is_enabled')
    .eq('section_key', SECTION_KEY)
    .order('display_order')
    .limit(MAX_ITEMS)

  const result = await query
  if (!result.error) return result

  const message = result.error.message ?? ''
  if (!message.includes('cover_image_url')) return result

  return adminClient
    .from('home_instagram_reels')
    .select('id, instagram_url, title, display_order, is_enabled')
    .eq('section_key', SECTION_KEY)
    .order('display_order')
    .limit(MAX_ITEMS)
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const [sectionResult, itemsResult] = await Promise.all([
    access.adminClient.from('home_instagram_reels_section').select('heading, subtitle, is_enabled, marquee_duration_seconds, pause_on_hover').eq('section_key', SECTION_KEY).maybeSingle(),
    loadItems(access.adminClient),
  ])

  if (sectionResult.error || itemsResult.error) {
    return NextResponse.json({ error: sectionResult.error?.message ?? itemsResult.error?.message }, { status: 500 })
  }

  return NextResponse.json({ section: sectionResult.data, items: itemsResult.data ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body.heading !== 'string' || typeof body.subtitle !== 'string' || !Array.isArray(body.items) || body.items.length > MAX_ITEMS) {
    return NextResponse.json({ error: 'Invalid payload. A maximum of 30 reels is allowed.' }, { status: 400 })
  }

  const duration = Number(body.marquee_duration_seconds)
  if (!Number.isInteger(duration) || duration < 10 || duration > 180 || typeof body.is_enabled !== 'boolean' || typeof body.pause_on_hover !== 'boolean') {
    return NextResponse.json({ error: 'Invalid section settings.' }, { status: 400 })
  }

  const heading = body.heading.trim()
  const subtitle = body.subtitle.trim()
  if (!heading || heading.length > 120 || subtitle.length > 240) {
    return NextResponse.json({ error: 'Heading or subtitle is invalid.' }, { status: 400 })
  }

  const seen = new Set<string>()
  let rows: ReelRow[]

  try {
    rows = (body.items as ReelInput[]).map((item, index) => {
      const instagramUrl = canonicalizeInstagramUrl(item.instagram_url)
      const title = typeof item.title === 'string' ? item.title.trim() : ''
      const coverImageUrl = cleanCoverImageUrl(item.cover_image_url)

      if (!instagramUrl || title.length > 100 || seen.has(instagramUrl)) {
        throw new Error('Each reel must have a unique, valid public Instagram Reel or post URL.')
      }

      seen.add(instagramUrl)

      return {
        ...(typeof item.id === 'string' && UUID_PATTERN.test(item.id) ? { id: item.id } : {}),
        section_key: SECTION_KEY,
        instagram_url: instagramUrl,
        title,
        cover_image_url: coverImageUrl,
        display_order: index,
        is_enabled: item.is_enabled !== false,
        created_by: access.user.id,
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid reel list.' }, { status: 400 })
  }

  const { error: sectionError } = await access.adminClient.from('home_instagram_reels_section').upsert({
    section_key: SECTION_KEY,
    heading,
    subtitle,
    is_enabled: body.is_enabled,
    marquee_duration_seconds: duration,
    pause_on_hover: body.pause_on_hover,
  }, { onConflict: 'section_key' })

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  let savedItems: Array<{ id: string; instagram_url: string; title: string; cover_image_url?: string | null; display_order: number; is_enabled: boolean }> = []
  let warning: string | null = null

  if (rows.length) {
    const { data, error } = await access.adminClient
      .from('home_instagram_reels')
      .upsert(rows, { onConflict: 'id' })
      .select('id, instagram_url, title, cover_image_url, display_order, is_enabled')

    if (error?.message?.includes('cover_image_url')) {
      warning = 'Reel URLs were saved, but cover images need the cover_image_url database column before they can persist.'
      const rowsWithoutCover = rows.map(({ cover_image_url: _coverImageUrl, ...row }) => row)
      const fallback = await access.adminClient
        .from('home_instagram_reels')
        .upsert(rowsWithoutCover, { onConflict: 'id' })
        .select('id, instagram_url, title, display_order, is_enabled')

      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
      savedItems = (fallback.data ?? []).map((item) => ({ ...item, cover_image_url: null }))
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      savedItems = data ?? []
    }
  }

  const retainedIds = savedItems.map((row) => row.id).filter(Boolean)
  let deleteQuery = access.adminClient.from('home_instagram_reels').delete().eq('section_key', SECTION_KEY)
  if (retainedIds.length) deleteQuery = deleteQuery.not('id', 'in', `(${retainedIds.join(',')})`)
  const { error: deleteError } = await deleteQuery
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true, items: savedItems, warning })
}