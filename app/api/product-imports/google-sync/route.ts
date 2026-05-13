import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { fetchGoogleSheetImportRows, fetchGoogleSheetTabs, SUPPORTED_GOOGLE_SHEET_TABS, type GoogleSheetSyncTab } from '@/lib/google-sheet-import'
import { classifyGoogleSheetRows } from '@/lib/product-import-sync-diff'

function normalizeLane(value: unknown) {
  if (value === 'standard' || value === 'hiphop' || value === 'collection') return value
  return null
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

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  try {
    const { searchParams } = new URL(request.url)
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

    const parsed = await fetchGoogleSheetImportRows(sheetUrl, tabName)
    const classified = await classifyGoogleSheetRows(parsed.rows)
    const actionableRows = classified.rows.filter((entry) => entry.changeType !== 'unchanged')

    if (actionableRows.length < 1) {
      return NextResponse.json({
        item: {
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

    return NextResponse.json({
      item: {
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
