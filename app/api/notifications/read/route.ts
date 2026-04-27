import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('schema cache') || error?.message?.includes('does not exist')
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  const notificationKey = typeof body?.notificationKey === 'string' ? body.notificationKey.trim() : ''

  if (!notificationKey) {
    return NextResponse.json({ error: 'Missing notification key.' }, { status: 400 })
  }

  const { error } = await access.adminClient.from('admin_notification_reads').upsert(
    {
      admin_user_id: access.user.id,
      notification_key: notificationKey,
      read_at: new Date().toISOString(),
    },
    { onConflict: 'admin_user_id,notification_key' },
  )

  if (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({ error: 'Notification read-tracking is not enabled yet.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
