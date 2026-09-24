import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const KEY = 'additional_summary_details'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function optionalUrl(value: unknown) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.length > 2000) return undefined
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined
  } catch { return undefined }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data: section, error } = await access.adminClient.from('cms_summary_sections').select('id, heading, is_enabled, cms_summary_pointers(id, sort_order, icon_url, pointer_text, video_url, video_link_text)').eq('section_key', KEY).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!section) return NextResponse.json({ section: null, pointers: [] })
  const { cms_summary_pointers: pointers, ...summarySection } = section
  pointers?.sort((a, b) => a.sort_order - b.sort_order)
  return NextResponse.json({ section: summarySection, pointers: pointers ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || typeof body.heading !== 'string' || !body.heading.trim() || body.heading.length > 200 || typeof body.is_enabled !== 'boolean') return NextResponse.json({ error: 'Enter a heading up to 200 characters and choose visibility.' }, { status: 400 })
  const { data, error } = await access.adminClient.from('cms_summary_sections').upsert({ section_key: KEY, heading: body.heading.trim(), is_enabled: body.is_enabled, updated_at: new Date().toISOString() }, { onConflict: 'section_key' }).select('id, heading, is_enabled').single()
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ section: data })
}

export async function PUT(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body || (body.id && !uuid.test(body.id)) || typeof body.pointer_text !== 'string' || !body.pointer_text.trim() || body.pointer_text.length > 500 || (body.video_link_text != null && (typeof body.video_link_text !== 'string' || body.video_link_text.length > 150))) return NextResponse.json({ error: 'Enter pointer text up to 500 characters and video link text up to 150 characters.' }, { status: 400 })
  const iconUrl = optionalUrl(body.icon_url)
  const videoUrl = optionalUrl(body.video_url)
  if (iconUrl === undefined || videoUrl === undefined || (body.video_link_text?.trim() && !videoUrl)) return NextResponse.json({ error: 'Use valid HTTP(S) icon and video URLs. Video link text requires a video URL.' }, { status: 400 })
  const { data: section, error: sectionError } = await access.adminClient.from('cms_summary_sections').select('id').eq('section_key', KEY).maybeSingle()
  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })
  if (!section) return NextResponse.json({ error: 'Save the heading first.' }, { status: 400 })
  const record = { section_id: section.id, pointer_text: body.pointer_text.trim(), icon_url: iconUrl, video_url: videoUrl, video_link_text: body.video_link_text?.trim() || null, sort_order: Number.isInteger(body.sort_order) && body.sort_order >= 0 && body.sort_order <= 10000 ? body.sort_order : 0, updated_at: new Date().toISOString() }
  const query = body.id
    ? access.adminClient.from('cms_summary_pointers').update(record).eq('id', body.id).eq('section_id', section.id)
    : access.adminClient.from('cms_summary_pointers').insert(record)
  const { data, error } = await query.select('id, sort_order, icon_url, pointer_text, video_url, video_link_text').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return data ? NextResponse.json({ pointer: data }) : NextResponse.json({ error: 'Pointer not found.' }, { status: 404 })
}

export async function DELETE(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!uuid.test(body?.id ?? '')) return NextResponse.json({ error: 'Invalid pointer.' }, { status: 400 })
  const { data: section } = await access.adminClient.from('cms_summary_sections').select('id').eq('section_key', KEY).maybeSingle()
  if (!section) return NextResponse.json({ error: 'Section not found.' }, { status: 404 })
  const { data, error } = await access.adminClient.from('cms_summary_pointers').delete().eq('id', body.id).eq('section_id', section.id).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return data ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Pointer not found.' }, { status: 404 })
}
