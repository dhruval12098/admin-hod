import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

type Lane = 'standard' | 'hiphop' | 'collection'

function isLane(value: unknown): value is Lane {
  return value === 'standard' || value === 'hiphop' || value === 'collection'
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null) as { lane?: unknown } | null
  if (!body || !isLane(body.lane)) {
    return NextResponse.json({ error: 'Invalid lane.' }, { status: 400 })
  }

  const { adminClient } = access
  const lane = body.lane

  const { data: drafts, error: draftsError } = await adminClient
    .from('products')
    .select('id')
    .eq('product_lane', lane)
    .eq('status', 'draft')
    .order('created_at', { ascending: true })

  if (draftsError) {
    return NextResponse.json({ error: draftsError.message }, { status: 500 })
  }

  let activatedCount = 0

  for (const draft of drafts ?? []) {
    const { error } = await adminClient
      .from('products')
      .update({ status: 'active' })
      .eq('id', draft.id)
      .eq('status', 'draft')

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          activatedCount,
        },
        { status: 500 }
      )
    }

    activatedCount += 1
  }

  return NextResponse.json({
    activatedCount,
    message:
      activatedCount > 0
        ? `Activated ${activatedCount} draft product${activatedCount === 1 ? '' : 's'}.`
        : 'No draft products were found for this section.',
  })
}
