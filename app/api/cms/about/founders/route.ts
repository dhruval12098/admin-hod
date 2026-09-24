import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { loadCmsContentListSnapshot, readCmsSaveEnvelope, saveCmsContentList } from '@/lib/cms-content-list-save'
import { cmsContentListSchemas } from '@/lib/cms-content-list-schemas'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return NextResponse.json(await loadCmsContentListSnapshot(access.adminClient, 'about_founders'), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const envelope = readCmsSaveEnvelope(body)
  if (!envelope) return NextResponse.json({ error: 'This editor is out of date. Reload it before saving.' }, { status: 409 })
  const parsed = cmsContentListSchemas.about_founders.safeParse(body.items)
  if (!parsed.success) return NextResponse.json({ error: 'Every founder must be valid.' }, { status: 400 })
  const items = parsed.data.map((item) => ({ ...item, name: item.name.trim(), designation: item.designation.trim(), bio: item.bio.trim(), image_path: item.image_path.trim() }))
  return saveCmsContentList(access, 'about_founders', envelope, items)
}
