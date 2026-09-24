import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { saveCmsArticle } from '@/lib/cms-article-save'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.from('education_posts')
    .select('id, slug, title, category, author, date_label, read_time, is_published, sort_order, updated_at')
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: 'Unable to load education posts.' }, { status: 500 })
  return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return saveCmsArticle(access, 'education', null, await request.json().catch(() => null))
}
