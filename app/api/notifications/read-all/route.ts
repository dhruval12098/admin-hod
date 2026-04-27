import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { getNotificationsPageData } from '@/lib/notifications'

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes('schema cache') || error?.message?.includes('does not exist')
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const data = await getNotificationsPageData(access.user.id)
  const unread = data.items.filter((item) => !item.read)

  if (unread.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  const { error } = await access.adminClient.from('admin_notification_reads').upsert(
    unread.map((item) => ({
      admin_user_id: access.user.id,
      notification_key: item.notificationKey,
      read_at: new Date().toISOString(),
    })),
    { onConflict: 'admin_user_id,notification_key' },
  )

  if (error) {
    if (isMissingRelationError(error)) {
      return NextResponse.json({ error: 'Notification read-tracking is not enabled yet.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: unread.length })
}
