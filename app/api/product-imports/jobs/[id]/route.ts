import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { productImportBucket } from '@/lib/product-import-staging'

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Import job id is required.' }, { status: 400 })
    }

    const [{ data: job, error: jobError }, { data: rowIds, error: rowIdsError }, { data: fileRows, error: fileRowsError }] = await Promise.all([
      access.adminClient.from('import_jobs').select('id').eq('id', id).single(),
      access.adminClient.from('import_job_rows').select('id').eq('import_job_id', id),
      access.adminClient.from('import_job_files').select('storage_path').eq('import_job_id', id),
    ])

    if (jobError || !job) {
      return NextResponse.json({ error: 'Import job not found.' }, { status: 404 })
    }

    if (rowIdsError) {
      return NextResponse.json({ error: rowIdsError.message }, { status: 500 })
    }

    if (fileRowsError) {
      return NextResponse.json({ error: fileRowsError.message }, { status: 500 })
    }

    const rowIdList = (rowIds ?? []).map((row: { id: string }) => row.id)
    const storagePaths = (fileRows ?? [])
      .map((row: { storage_path: string | null }) => row.storage_path)
      .filter((value): value is string => Boolean(value))

    if (rowIdList.length > 0) {
      const { error: issuesDeleteError } = await access.adminClient
        .from('import_job_row_issues')
        .delete()
        .in('import_job_row_id', rowIdList)

      if (issuesDeleteError) {
        return NextResponse.json({ error: issuesDeleteError.message }, { status: 500 })
      }
    }

    const { error: filesDeleteError } = await access.adminClient.from('import_job_files').delete().eq('import_job_id', id)
    if (filesDeleteError) {
      return NextResponse.json({ error: filesDeleteError.message }, { status: 500 })
    }

    const { error: rowsDeleteError } = await access.adminClient.from('import_job_rows').delete().eq('import_job_id', id)
    if (rowsDeleteError) {
      return NextResponse.json({ error: rowsDeleteError.message }, { status: 500 })
    }

    const { error: sourceUpdateError } = await access.adminClient
      .from('google_sheet_sync_sources')
      .update({ last_job_id: null, updated_at: new Date().toISOString() })
      .eq('last_job_id', id)

    if (sourceUpdateError && !sourceUpdateError.message?.includes("google_sheet_sync_sources")) {
      return NextResponse.json({ error: sourceUpdateError.message }, { status: 500 })
    }

    const { error: jobDeleteError } = await access.adminClient.from('import_jobs').delete().eq('id', id)
    if (jobDeleteError) {
      return NextResponse.json({ error: jobDeleteError.message }, { status: 500 })
    }

    if (storagePaths.length > 0) {
      await access.adminClient.storage.from(productImportBucket).remove(storagePaths)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete this import job.' },
      { status: 400 }
    )
  }
}
