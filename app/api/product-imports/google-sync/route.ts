import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { extractSpreadsheetId, fetchGoogleSheetImportRows, fetchGoogleSheetTabs, SUPPORTED_GOOGLE_SHEET_TABS, type GoogleSheetSyncTab } from '@/lib/google-sheet-import'
import { classifyGoogleSheetRows } from '@/lib/product-import-sync-diff'

type GoogleSheetSyncSourceRow = {
  id: string
  source_name: string
  sheet_url: string
  spreadsheet_id: string
  tab_name: string
  lane: string
  is_active: boolean
  last_synced_at: string | null
  last_status: string | null
  last_scanned_count: number | null
  last_new_count: number | null
  last_updated_count: number | null
  last_unchanged_count: number | null
  last_job_id: string | null
  updated_at: string | null
}

function isMissingRelation(error: { message?: string | null } | null | undefined, table: string) {
  return (
    error?.message?.includes(`relation "${table}" does not exist`) ||
    error?.message?.includes(`Could not find the table 'public.${table}' in the schema cache`)
  ) ?? false
}

function normalizeLane(value: unknown) {
  if (value === 'standard' || value === 'hiphop' || value === 'collection') return value
  return 'mixed'
}

function normalizeTabName(value: unknown) {
  if (typeof value !== 'string') return null
  return SUPPORTED_GOOGLE_SHEET_TABS.includes(value as GoogleSheetSyncTab) ? (value as GoogleSheetSyncTab) : null
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function collectOrderedValues(values: Record<string, string>, prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => values[`${prefix}_${index + 1}`] ?? '')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function formatSourceItem(row: GoogleSheetSyncSourceRow) {
  return {
    id: row.id,
    name: row.source_name,
    sheetUrl: row.sheet_url,
    spreadsheetId: row.spreadsheet_id,
    tabName: row.tab_name,
    lane: row.lane === 'standard' || row.lane === 'hiphop' || row.lane === 'collection' ? row.lane : 'mixed',
    lastJobId: row.last_job_id,
    lastStatus: row.last_status === 'up_to_date' ? 'up_to_date' : 'staged',
    lastSyncedAt: row.last_synced_at || row.updated_at || new Date().toISOString(),
    summary: {
      totalRows: Number(row.last_scanned_count ?? 0),
      actionableRows: Number((row.last_new_count ?? 0) + (row.last_updated_count ?? 0)),
      newRows: Number(row.last_new_count ?? 0),
      updatedRows: Number(row.last_updated_count ?? 0),
      unchangedRows: Number(row.last_unchanged_count ?? 0),
      noChanges: row.last_status === 'up_to_date',
    },
  }
}

async function upsertSourceRecord(adminClient: any, params: {
  sourceName: string
  sheetUrl: string
  spreadsheetId: string
  tabName: GoogleSheetSyncTab
  lane: string
}) {
  const { data, error } = await adminClient
    .from('google_sheet_sync_sources')
    .upsert(
      {
        source_name: params.sourceName,
        sheet_url: params.sheetUrl,
        spreadsheet_id: params.spreadsheetId,
        tab_name: params.tabName,
        lane: params.lane,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'spreadsheet_id,tab_name',
      }
    )
    .select('*')
    .single()

  if (error) return { error }
  return { data: data as GoogleSheetSyncSourceRow }
}

async function updateSourceSyncSnapshot(adminClient: any, sourceId: string, params: {
  lastStatus: 'staged' | 'up_to_date'
  totalRows: number
  newRows: number
  updatedRows: number
  unchangedRows: number
  lastJobId: string | null
}) {
  const { data, error } = await adminClient
    .from('google_sheet_sync_sources')
    .update({
      last_synced_at: new Date().toISOString(),
      last_status: params.lastStatus,
      last_scanned_count: params.totalRows,
      last_new_count: params.newRows,
      last_updated_count: params.updatedRows,
      last_unchanged_count: params.unchangedRows,
      last_job_id: params.lastJobId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
    .select('*')
    .single()

  if (error) return { error }
  return { data: data as GoogleSheetSyncSourceRow }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  try {
    const { searchParams } = new URL(request.url)
    if (searchParams.get('listSources') === '1') {
      const { data, error } = await access.adminClient
        .from('google_sheet_sync_sources')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (error) {
        if (isMissingRelation(error, 'google_sheet_sync_sources')) {
          return NextResponse.json({ items: [] })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        items: ((data ?? []) as GoogleSheetSyncSourceRow[]).map(formatSourceItem),
      })
    }

    const sheetUrl = normalizeText(searchParams.get('sheetUrl'))
    if (!sheetUrl) {
      return NextResponse.json({ error: 'Google Sheet link is required.' }, { status: 400 })
    }

    const tabs = await fetchGoogleSheetTabs(sheetUrl)
    return NextResponse.json({
      item: {
        tabs: tabs.tabs,
        supportedTabs: tabs.supportedTabs,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to read Google Sheet tabs.' },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid Google Sheet sync request.' }, { status: 400 })
    }

    const sheetUrl = normalizeText(body.sheetUrl)
    const tabName = normalizeTabName(body.tabName)
    const jobName = normalizeText(body.jobName)
    const lane = normalizeLane(body.lane)

    if (!sheetUrl) {
      return NextResponse.json({ error: 'Google Sheet link is required.' }, { status: 400 })
    }
    if (!tabName) {
      return NextResponse.json({ error: 'Please select a supported sheet tab.' }, { status: 400 })
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Invalid Google Sheet link.' }, { status: 400 })
    }

    const sourceUpsert = await upsertSourceRecord(access.adminClient, {
      sourceName: jobName ?? `${tabName} Sync`,
      sheetUrl,
      spreadsheetId,
      tabName,
      lane,
    })
    if ('error' in sourceUpsert && sourceUpsert.error) {
      return NextResponse.json({ error: sourceUpsert.error.message }, { status: 500 })
    }
    const source = sourceUpsert.data
    if (!source) {
      return NextResponse.json({ error: 'Unable to persist the Google Sheet source.' }, { status: 500 })
    }

    const parsed = await fetchGoogleSheetImportRows(sheetUrl, tabName)
    const classified = await classifyGoogleSheetRows(parsed.rows)
    const actionableRows = classified.rows.filter((entry) => entry.changeType !== 'unchanged')

    if (actionableRows.length < 1) {
      const sourceUpdate = await updateSourceSyncSnapshot(access.adminClient, source.id, {
        lastStatus: 'up_to_date',
        totalRows: parsed.rows.length,
        newRows: classified.summary.newCount,
        updatedRows: classified.summary.updatedCount,
        unchangedRows: classified.summary.unchangedCount,
        lastJobId: null,
      })
      if ('error' in sourceUpdate && sourceUpdate.error) {
        return NextResponse.json({ error: sourceUpdate.error.message }, { status: 500 })
      }
      if (!sourceUpdate.data) {
        return NextResponse.json({ error: 'Unable to update the saved Google Sheet source.' }, { status: 500 })
      }

      return NextResponse.json({
        item: {
          source: formatSourceItem(sourceUpdate.data),
          id: null,
          status: 'no_changes',
          lane,
          totalRows: parsed.rows.length,
          actionableRows: 0,
          newRows: classified.summary.newCount,
          updatedRows: classified.summary.updatedCount,
          unchangedRows: classified.summary.unchangedCount,
          csvFileName: `${tabName}.google-sheet`,
          archiveFileName: null,
        },
      })
    }

    const { data: job, error: jobError } = await access.adminClient
      .from('import_jobs')
      .insert({
        created_by: access.user.id,
        job_name: jobName ?? `Google Sheet Sync - ${tabName}`,
        lane,
        status: 'uploaded',
        csv_file_name: `${tabName}.google-sheet`,
        zip_file_name: null,
        total_rows: actionableRows.length,
        notes: `Rows were staged from Google Sheet tab "${tabName}". New: ${classified.summary.newCount}. Updated: ${classified.summary.updatedCount}. Unchanged skipped: ${classified.summary.unchangedCount}. Validation and import execution have not run yet.`,
      })
      .select('*')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message ?? 'Unable to create import job.' }, { status: 500 })
    }

    const rowPayload = actionableRows.map(({ rowNumber, values, changeType }) => {
      const metals = collectOrderedValues(values, 'metal', 3).join('|')
      const certificates = collectOrderedValues(values, 'certificate', 2).join('|')

      return {
        import_job_id: job.id,
        row_number: rowNumber,
        status: 'pending',
        sku: values.sku || null,
        product_name: values.product_name || null,
        lane: values.lane || null,
        category: values.category || null,
        subcategory: values.subcategory || null,
        option_name: values.option_name || null,
        style_name: values.style_name || null,
        description: values.description || null,
        tag_line: null,
        featured: null,
        ready_to_ship: null,
        allow_checkout: null,
        stock_quantity: Number.isFinite(Number(values.stock_quantity)) && values.stock_quantity !== '' ? Number(values.stock_quantity) : null,
        discount_price: Number.isFinite(Number(values.discount_price)) && values.discount_price !== '' ? Number(values.discount_price) : null,
        gst_slab_name: values.gst_slab_name || null,
        metals_raw: metals || null,
        certificates_raw: certificates || null,
        purity_1_label: values.purity_1_label || null,
        purity_1_price: Number.isFinite(Number(values.purity_1_price)) && values.purity_1_price !== '' ? Number(values.purity_1_price) : null,
        purity_2_label: values.purity_2_label || null,
        purity_2_price: Number.isFinite(Number(values.purity_2_price)) && values.purity_2_price !== '' ? Number(values.purity_2_price) : null,
        purity_3_label: values.purity_3_label || null,
        purity_3_price: Number.isFinite(Number(values.purity_3_price)) && values.purity_3_price !== '' ? Number(values.purity_3_price) : null,
        image_1: values.image_1 || null,
        image_2: values.image_2 || null,
        image_3: values.image_3 || null,
        image_4: values.image_4 || null,
        video: values.video || null,
        shipping_rule_name: null,
        care_warranty_rule_name: null,
        engraving_label: values.engraving_label || null,
        raw_payload: values,
        normalized_payload: null,
        import_message:
          changeType === 'updated'
            ? `Existing SKU change detected from Google Sheet tab "${tabName}". Validation is pending.`
            : `New SKU staged from Google Sheet tab "${tabName}". Validation is pending.`,
      }
    })

    if (rowPayload.length > 0) {
      const { error: rowsError } = await access.adminClient.from('import_job_rows').insert(rowPayload)
      if (rowsError) {
        await access.adminClient.from('import_jobs').delete().eq('id', job.id)
        return NextResponse.json({ error: rowsError.message }, { status: 500 })
      }
    }

    const sourceUpdate = await updateSourceSyncSnapshot(access.adminClient, source.id, {
      lastStatus: 'staged',
      totalRows: parsed.rows.length,
      newRows: classified.summary.newCount,
      updatedRows: classified.summary.updatedCount,
      unchangedRows: classified.summary.unchangedCount,
      lastJobId: job.id,
    })
    if ('error' in sourceUpdate && sourceUpdate.error) {
      return NextResponse.json({ error: sourceUpdate.error.message }, { status: 500 })
    }
    if (!sourceUpdate.data) {
      return NextResponse.json({ error: 'Unable to update the saved Google Sheet source.' }, { status: 500 })
    }

    return NextResponse.json({
      item: {
        source: formatSourceItem(sourceUpdate.data),
        id: job.id,
        status: 'uploaded',
        lane,
        totalRows: parsed.rows.length,
        actionableRows: actionableRows.length,
        newRows: classified.summary.newCount,
        updatedRows: classified.summary.updatedCount,
        unchangedRows: classified.summary.unchangedCount,
        csvFileName: `${tabName}.google-sheet`,
        archiveFileName: null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to stage this Google Sheet sync job.' },
      { status: 400 }
    )
  }
}
