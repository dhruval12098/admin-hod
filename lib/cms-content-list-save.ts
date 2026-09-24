import { NextResponse } from 'next/server'
import type { assertAdmin } from './cms-auth'
import { readCmsSaveEnvelope } from './cms-atomic-save'

export type CmsContentListKind = 'about_values' | 'about_timeline' | 'about_founders' | 'contact_info' | 'bespoke_process' | 'bespoke_manufacturing'
type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>

export { readCmsSaveEnvelope }

export async function loadCmsContentListSnapshot(
  client: { rpc: (name: string, args: Record<string, unknown>) => any },
  kind: CmsContentListKind,
) {
  const { data, error } = await client.rpc('cms_content_list_snapshot_v1', { p_kind: kind })
  if (error) {
    throw new Error(error.code === 'PGRST202' || error.code === '42883'
      ? 'This CMS section is awaiting its database migration.'
      : 'Unable to load this CMS section.')
  }
  return data as { items: Array<Record<string, unknown>>; revision: string }
}

export async function saveCmsContentList(
  access: Access,
  kind: CmsContentListKind,
  envelope: { requestId: string; revision: string; deletedIds: string[] },
  items: Array<Record<string, unknown>>,
) {
  const { data, error } = await access.adminClient.rpc('cms_save_content_list_v1', {
    p_actor_id: access.user.id,
    p_request_id: envelope.requestId,
    p_expected_revision: envelope.revision,
    p_kind: kind,
    p_items: items,
    p_deleted_ids: envelope.deletedIds,
  })

  if (!error) return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } })
  if (error.code === 'PGRST202' || error.code === '42883') {
    return NextResponse.json({ error: 'This CMS section is awaiting its database update. Existing content was not changed.' }, { status: 503 })
  }
  if (error.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
  if (error.code === '22023' || error.code === '22P02' || error.code === '23503' || error.code === '23514') {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ error: 'Unable to save this section. No part of the save was committed.' }, { status: 500 })
}
