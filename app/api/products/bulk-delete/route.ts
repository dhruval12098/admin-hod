import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : []

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No product ids provided.' }, { status: 400 })
  }

  const { error } = await access.adminClient.from('products').delete().in('id', ids)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deletedCount: ids.length })
}
