import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import {
  buildImportStoragePath,
  parseProductImportCsv,
  parseProductImportWorkbook,
  productImportBucket,
  productImportMaxArchiveBytes,
  productImportMaxCsvBytes,
  productImportMaxWorkbookBytes,
} from '@/lib/product-import-staging'

function normalizeLane(value: FormDataEntryValue | null) {
  if (value === 'standard' || value === 'hiphop' || value === 'collection') {
    return value
  }

  return null
}

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function collectOrderedValues(values: Record<string, string>, prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => values[`${prefix}_${index + 1}`] ?? '')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function ensureDataFile(file: File | null) {
  if (!(file instanceof File)) {
    throw new Error('Please upload the product import file before creating the staging job.')
  }

  const lowerName = file.name.toLowerCase()
  const isCsv = file.type === 'text/csv' || lowerName.endsWith('.csv')
  const isWorkbook =
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lowerName.endsWith('.xlsx')

  if (!isCsv && !isWorkbook) {
    throw new Error('Only CSV or XLSX files are allowed for the product data upload.')
  }

  if (isCsv && file.size > productImportMaxCsvBytes) {
    throw new Error('CSV file is too large. Please keep it under 5 MB for staging.')
  }

  if (isWorkbook && file.size > productImportMaxWorkbookBytes) {
    throw new Error('Excel workbook is too large. Please keep it under 8 MB for staging.')
  }

  return file
}

function ensureArchiveFile(file: File | null) {
  if (!(file instanceof File)) return null

  const lowerName = file.name.toLowerCase()
  const isZip =
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    lowerName.endsWith('.zip')

  if (!isZip) {
    throw new Error('Only ZIP archives are allowed for the image batch upload.')
  }

  if (file.size > productImportMaxArchiveBytes) {
    throw new Error('ZIP archive is too large. Please keep it under 250 MB for staging.')
  }

  return file
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  let uploadedPaths: string[] = []

  try {
    const formData = await request.formData().catch((error) => {
      throw new Error(
        error instanceof Error
          ? `Unable to read the upload form data. ${error.message}`
          : 'Unable to read the upload form data.'
      )
    })
    if (!formData) {
      return NextResponse.json({ error: 'Invalid staging upload request.' }, { status: 400 })
    }

    const dataFile = ensureDataFile(formData.get('csv_file') as File | null)
    const archiveFile = ensureArchiveFile(formData.get('asset_archive') as File | null)
    const lane = normalizeLane(formData.get('lane'))
    const jobName = normalizeText(formData.get('job_name'))

    const lowerName = dataFile.name.toLowerCase()
    const dataBuffer = Buffer.from(await dataFile.arrayBuffer())
    const parsed = lowerName.endsWith('.xlsx')
      ? await parseProductImportWorkbook(dataBuffer)
      : parseProductImportCsv(dataBuffer.toString('utf8'))

    const { data: job, error: jobError } = await access.adminClient
      .from('import_jobs')
      .insert({
        created_by: access.user.id,
        job_name: jobName,
        lane,
        status: 'uploaded',
        csv_file_name: dataFile.name,
        zip_file_name: archiveFile?.name ?? null,
        total_rows: parsed.rows.length,
        notes: 'Rows and uploaded files are staged. Validation and import execution have not run yet.',
      })
      .select('*')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message ?? 'Unable to create import job.' }, { status: 500 })
    }

    const csvStoragePath = buildImportStoragePath(job.id, 'csv', dataFile.name)
    const { error: csvUploadError } = await access.adminClient.storage
      .from(productImportBucket)
      .upload(csvStoragePath, dataBuffer, {
        contentType: dataFile.type || (lowerName.endsWith('.xlsx')
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'),
        upsert: false,
      })

    if (csvUploadError) {
      await access.adminClient.from('import_jobs').delete().eq('id', job.id)
      return NextResponse.json({ error: csvUploadError.message }, { status: 500 })
    }
    uploadedPaths.push(csvStoragePath)

    let archiveStoragePath: string | null = null
    if (archiveFile) {
      archiveStoragePath = buildImportStoragePath(job.id, 'archive', archiveFile.name)
      const { error: archiveUploadError } = await access.adminClient.storage
        .from(productImportBucket)
        .upload(archiveStoragePath, Buffer.from(await archiveFile.arrayBuffer()), {
          contentType: archiveFile.type || 'application/zip',
          upsert: false,
        })

      if (archiveUploadError) {
        await access.adminClient.storage.from(productImportBucket).remove(uploadedPaths)
        await access.adminClient.from('import_jobs').delete().eq('id', job.id)
        return NextResponse.json({ error: archiveUploadError.message }, { status: 500 })
      }
      uploadedPaths.push(archiveStoragePath)
    }

    const rowPayload = parsed.rows.map(({ rowNumber, values }) => {
      const metals = values.metals_raw
        ? values.metals_raw
        : collectOrderedValues(values, 'metal', 3).join('|')
      const certificates = values.certificates_raw
        ? values.certificates_raw
        : collectOrderedValues(values, 'certificate', 2).join('|')

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
        import_message: 'Row staged successfully. Validation is pending.',
      }
    })

    if (rowPayload.length > 0) {
      const { error: rowsError } = await access.adminClient.from('import_job_rows').insert(rowPayload)
      if (rowsError) {
        await access.adminClient.storage.from(productImportBucket).remove(uploadedPaths)
        await access.adminClient.from('import_jobs').delete().eq('id', job.id)
        return NextResponse.json({ error: rowsError.message }, { status: 500 })
      }
    }

    const filePayload = [
      {
        import_job_id: job.id,
        original_file_name: dataFile.name,
        normalized_file_name: dataFile.name.toLowerCase(),
        storage_path: csvStoragePath,
        mime_type: dataFile.type || (lowerName.endsWith('.xlsx')
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'),
        file_size: dataFile.size,
        matched_sku: null,
        matched_row_id: null,
        file_role: 'unmatched',
        status: 'uploaded',
      },
      ...(archiveFile && archiveStoragePath
        ? [
            {
              import_job_id: job.id,
              original_file_name: archiveFile.name,
              normalized_file_name: archiveFile.name.toLowerCase(),
              storage_path: archiveStoragePath,
              mime_type: archiveFile.type || 'application/zip',
              file_size: archiveFile.size,
              matched_sku: null,
              matched_row_id: null,
              file_role: 'unmatched',
              status: 'uploaded',
            },
          ]
        : []),
    ]

    const { error: filesError } = await access.adminClient.from('import_job_files').insert(filePayload)
    if (filesError) {
      await access.adminClient.storage.from(productImportBucket).remove(uploadedPaths)
      await access.adminClient.from('import_job_rows').delete().eq('import_job_id', job.id)
      await access.adminClient.from('import_jobs').delete().eq('id', job.id)
      return NextResponse.json({ error: filesError.message }, { status: 500 })
    }

    const { error: jobUpdateError } = await access.adminClient
      .from('import_jobs')
      .update({
        csv_storage_path: csvStoragePath,
        zip_storage_path: archiveStoragePath,
      })
      .eq('id', job.id)

    if (jobUpdateError) {
      return NextResponse.json({ error: jobUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({
      item: {
        id: job.id,
        status: 'uploaded',
        lane,
        totalRows: parsed.rows.length,
        csvFileName: dataFile.name,
        archiveFileName: archiveFile?.name ?? null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to stage this import job.',
      },
      { status: 400 }
    )
  }
}
