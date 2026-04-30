import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { executeImportJob } from '@/lib/product-import-execution'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  try {
    const { id } = await params
    const result = await executeImportJob(id)
    return NextResponse.json({ item: result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to execute this import job.' },
      { status: 400 }
    )
  }
}

