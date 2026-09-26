import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { notificationReadSchema, notificationWriteError } from '@/lib/admin-read-validation'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const input = notificationReadSchema.safeParse(await request.json().catch(() => null))
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? 'Invalid notification.' }, { status: 400 })

  const { error } = await access.adminClient.from('admin_notification_reads').upsert({
    admin_user_id: access.user.id,
    notification_key: input.data.notificationKey,
    read_at: new Date().toISOString(),
  }, { onConflict: 'admin_user_id,notification_key' })
  if (error) {
    const safe = notificationWriteError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
