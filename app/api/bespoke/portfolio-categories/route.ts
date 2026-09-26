import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { portfolioCategoryCreateSchema, portfolioMutationError } from '@/lib/bespoke-portfolio-validation'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data, error } = await access.adminClient
    .from('bespoke_portfolio_categories')
    .select('id, name, slug, display_order, status, created_at, updated_at')
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: 'Unable to load portfolio categories.' }, { status: 500 })
  return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const parsed = portfolioCategoryCreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid portfolio category.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('bespoke_portfolio_categories')
    .insert(parsed.data)
    .select('id, name, slug, display_order, status, created_at, updated_at')
    .single()

  if (error) {
    const safe = portfolioMutationError(error, 'category', 'save')
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
  return NextResponse.json({ item: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
