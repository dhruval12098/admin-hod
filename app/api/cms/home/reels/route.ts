import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { reelsSaveError, reelsSaveSchema } from '@/lib/cms-reels-save'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.rpc('cms_reels_snapshot_v1')
  if (error) {
    const failure = reelsSaveError(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const parsed = reelsSaveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'Save'}: ${issue.message}`).join(' '),
    }, { status: 400 })
  }
  const { request_id, expected_revision, deleted_ids, items, ...section } = parsed.data
  const { data, error } = await access.adminClient.rpc('cms_save_reels_v1', {
    p_actor_id: access.user.id,
    p_request_id: request_id,
    p_expected_revision: expected_revision,
    p_section: section,
    p_items: items,
    p_deleted_ids: deleted_ids,
  })
  if (error) {
    const failure = reelsSaveError(error)
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } })
}
