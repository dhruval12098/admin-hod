import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Connected sheet id is required.' }, { status: 400 })
    }

    const { error } = await access.adminClient
      .from('google_sheet_sync_sources')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete this connected sheet.' },
      { status: 400 }
    )
  }
}
