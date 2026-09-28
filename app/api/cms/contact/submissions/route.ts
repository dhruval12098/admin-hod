import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const params = new URL(request.url).searchParams
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 25))
  const from = (page - 1) * pageSize
  const { data, error, count } = await access.adminClient.from('contact_submissions')
    .select('id, full_name, email, phone, topic, message, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false }).range(from, from + pageSize - 1)
  if (error) return NextResponse.json({ error: 'Unable to load contact submissions.' }, { status: 500 })
  return NextResponse.json({ items: data ?? [], page, pageSize, total: count ?? 0 }, { headers: { 'Cache-Control': 'no-store' } })
}
