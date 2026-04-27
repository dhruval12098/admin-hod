import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await context.params

  const { data, error } = await access.adminClient
    .from('bespoke_submissions')
    .select('id, full_name, email, phone, country, piece_type, stone_preference, approx_carat, preferred_metal, message, status, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 })

  return NextResponse.json({ item: data })
}
