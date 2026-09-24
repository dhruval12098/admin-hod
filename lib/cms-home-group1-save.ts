import { NextResponse } from 'next/server'
import type { assertAdmin } from './cms-auth'

export type HomeGroup1Kind = 'hero' | 'collection' | 'certifications' | 'discover_shapes' | 'bestsellers' | 'shop_by_category'
type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>
type SnapshotRecord = Record<string, unknown>

export async function loadHomeGroup1Snapshot(client: { rpc: (name: string, args: Record<string, unknown>) => any }, kind: HomeGroup1Kind) {
  const { data, error } = await client.rpc('cms_home_group1_snapshot_v1', { p_kind: kind })
  if (error) throw new Error(error.code === 'PGRST202' || error.code === '42883'
    ? 'This CMS section is awaiting its database migration.' : 'Unable to load this CMS section.')
  return data as { section: SnapshotRecord | null; items: SnapshotRecord[]; revision: string }
}

export function readHomeGroup1Envelope(body: Record<string, unknown>) {
  const requestId = typeof body.request_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id) ? body.request_id : null
  const revision = typeof body.expected_revision === 'string' && /^[0-9a-f]{32}$/.test(body.expected_revision) ? body.expected_revision : null
  const rawDeletedIds = Array.isArray(body.deleted_ids) && body.deleted_ids.every((id) => typeof id === 'string' && id.length > 0)
    ? body.deleted_ids as string[] : null
  const deletedIds = rawDeletedIds && new Set(rawDeletedIds).size === rawDeletedIds.length ? rawDeletedIds : null
  return requestId && revision && deletedIds ? { requestId, revision, deletedIds } : null
}

export async function saveHomeGroup1(
  access: Access,
  kind: HomeGroup1Kind,
  envelope: { requestId: string; revision: string; deletedIds: string[] },
  section: Record<string, unknown> | null,
  items: Array<Record<string, unknown>>,
) {
  const { data, error } = await access.adminClient.rpc('cms_save_home_group1_v1', {
    p_actor_id: access.user.id,
    p_request_id: envelope.requestId,
    p_expected_revision: envelope.revision,
    p_kind: kind,
    p_section: section,
    p_items: items,
    p_deleted_ids: envelope.deletedIds,
  })
  if (!error) return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } })
  if (error.code === 'PGRST202' || error.code === '42883') return NextResponse.json({ error: 'This CMS section is awaiting its database update. Existing content was not changed.' }, { status: 503 })
  if (error.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
  if (error.code === '22023' || error.code === '22P02' || error.code === '23503') return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ error: 'Unable to save this section. No part of the save was committed.' }, { status: 500 })
}
