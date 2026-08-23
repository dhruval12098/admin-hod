import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null) as { status?: unknown } | null

  if (!UUID_PATTERN.test(id) || body?.status !== 'draft') {
    return NextResponse.json({ error: 'A valid product and draft status are required.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('products')
    .update({ status: 'draft' })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

  return NextResponse.json({ item: data })
}
