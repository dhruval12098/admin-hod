import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const query = (searchParams.get('q') || '').trim().toLowerCase()

  let builder = access.adminClient
    .from('bespoke_submissions')
    .select('id, full_name, email, phone, country, piece_type, stone_preference, approx_carat, preferred_metal, message, status, created_at')
    .order('created_at', { ascending: false })

  if (from) builder = builder.gte('created_at', `${from}T00:00:00.000Z`)
  if (to) builder = builder.lte('created_at', `${to}T23:59:59.999Z`)

  const { data, error } = await builder

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).filter((item) => {
    if (!query) return true
    const haystack = [
      item.full_name,
      item.email,
      item.phone,
      item.country,
      item.piece_type,
      item.stone_preference,
      item.approx_carat,
      item.preferred_metal,
      item.message,
      item.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })

  return NextResponse.json({ items })
}
