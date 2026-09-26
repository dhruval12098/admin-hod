import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { getNotificationsPageData } from '@/lib/notifications'
import { notificationWriteError } from '@/lib/admin-read-validation'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  let unread
  try {
    const data = await getNotificationsPageData(access.user.id)
    unread = data.items.filter((item) => !item.read)
  } catch {
    return NextResponse.json({ error: 'Unable to load current notifications.' }, { status: 500 })
  }
  if (unread.length === 0) return NextResponse.json({ ok: true, count: 0 }, { headers: { 'Cache-Control': 'no-store' } })

  const readAt = new Date().toISOString()
  const { error } = await access.adminClient.from('admin_notification_reads').upsert(
    unread.map((item) => ({ admin_user_id: access.user.id, notification_key: item.notificationKey, read_at: readAt })),
    { onConflict: 'admin_user_id,notification_key' },
  )
  if (error) {
    const safe = notificationWriteError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
  return NextResponse.json({ ok: true, count: unread.length }, { headers: { 'Cache-Control': 'no-store' } })
}
