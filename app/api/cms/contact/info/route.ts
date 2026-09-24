import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCmsContentListSnapshot, readCmsSaveEnvelope, saveCmsContentList } from '@/lib/cms-content-list-save'
import { cmsContentListSchemas } from '@/lib/cms-content-list-schemas'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return NextResponse.json(await loadCmsContentListSnapshot(access.adminClient, 'contact_info'), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const envelope = readCmsSaveEnvelope(body)
  if (!envelope) return NextResponse.json({ error: 'This editor is out of date. Reload it before saving.' }, { status: 409 })
  const parsed = cmsContentListSchemas.contact_info.safeParse(body.items)
  if (!parsed.success) return NextResponse.json({ error: 'Every contact card must be valid.' }, { status: 400 })
  const items = parsed.data.map((item) => ({ ...item, label: item.label.trim(), value: item.value.trim(), note: item.note.trim(), href: item.href.trim(), icon_path: item.icon_path.trim() }))
  return saveCmsContentList(access, 'contact_info', envelope, items)
}
