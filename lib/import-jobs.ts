import 'server-only'

import { buildAdminClient } from '@/lib/cms-auth'

export type ImportJobStatus =
  | 'uploaded'
  | 'parsing'
  | 'validating'
  | 'ready'
  | 'importing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled'

export type ImportJobLane = 'standard' | 'hiphop' | 'collection' | null

export type ImportJobRecord = {
  id: string
  created_at: string
  updated_at: string
  created_by: string | null
  job_name: string | null
  status: ImportJobStatus
  lane: ImportJobLane
  csv_file_name: string | null
  csv_storage_path: string | null
  zip_file_name: string | null
  zip_storage_path: string | null
  total_rows: number | null
  valid_rows: number | null
  warning_rows: number | null
  error_rows: number | null
  imported_rows: number | null
  skipped_rows: number | null
  started_at: string | null
  finished_at: string | null
  notes: string | null
}

export type ImportJobIssueRecord = {
  id: string
  import_job_row_id: string
  issue_type: 'warning' | 'error'
  field_name: string | null
  issue_code: string | null
  message: string
}

export type ImportJobRowRecord = {
  id: string
  import_job_id: string
  row_number: number
  status: 'pending' | 'validated' | 'warning' | 'error' | 'imported' | 'skipped'
  sku: string | null
  product_name: string | null
  lane: string | null
  category: string | null
  subcategory: string | null
  option_name: string | null
  style_name: string | null
  description: string | null
  tag_line: string | null
  stock_quantity: number | null
  discount_price: number | null
  gst_slab_name: string | null
  metals_raw: string | null
  certificates_raw: string | null
  purity_1_label: string | null
  purity_1_price: number | null
  purity_2_label: string | null
  purity_2_price: number | null
  purity_3_label: string | null
  purity_3_price: number | null
  image_1: string | null
  image_2: string | null
  image_3: string | null
  image_4: string | null
  video: string | null
  shipping_rule_name: string | null
  care_warranty_rule_name: string | null
  engraving_label: string | null
  raw_payload: Record<string, string> | null
  normalized_payload: Record<string, unknown> | null
  import_message: string | null
  issues?: ImportJobIssueRecord[]
}

export type ImportJobDetail = {
  job: ImportJobRecord | null
  rows: ImportJobRowRecord[]
  issueTotals: {
    warnings: number
    errors: number
  }
}

export type ImportJobsOverview = {
  jobs: ImportJobRecord[]
  totals: {
    totalJobs: number
    activeJobs: number
    readyJobs: number
    failedJobs: number
  }
}

const ACTIVE_JOB_STATUSES: ImportJobStatus[] = ['uploaded', 'parsing', 'validating', 'ready', 'importing']

export async function getImportJobsOverview(limit = 12): Promise<ImportJobsOverview> {
  const adminClient = buildAdminClient()
  if (!adminClient) {
    return {
      jobs: [],
      totals: { totalJobs: 0, activeJobs: 0, readyJobs: 0, failedJobs: 0 },
    }
  }

  const { data, error } = await adminClient
    .from('import_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return {
      jobs: [],
      totals: { totalJobs: 0, activeJobs: 0, readyJobs: 0, failedJobs: 0 },
    }
  }

  const jobs = (data ?? []) as ImportJobRecord[]

  return {
    jobs,
    totals: {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) => ACTIVE_JOB_STATUSES.includes(job.status)).length,
      readyJobs: jobs.filter((job) => job.status === 'ready').length,
      failedJobs: jobs.filter((job) => job.status === 'failed' || job.status === 'completed_with_errors').length,
    },
  }
}

export async function getImportJobDetail(jobId: string): Promise<ImportJobDetail> {
  const adminClient = buildAdminClient()
  if (!adminClient) {
    return {
      job: null,
      rows: [],
      issueTotals: { warnings: 0, errors: 0 },
    }
  }

  const [{ data: job, error: jobError }, { data: rows, error: rowsError }, { data: issues, error: issuesError }] = await Promise.all([
    adminClient.from('import_jobs').select('*').eq('id', jobId).single(),
    adminClient.from('import_job_rows').select('*').eq('import_job_id', jobId).order('row_number', { ascending: true }),
    adminClient.from('import_job_row_issues').select('*').in(
      'import_job_row_id',
      (
        await adminClient.from('import_job_rows').select('id').eq('import_job_id', jobId)
      ).data?.map((row: { id: string }) => row.id) ?? []
    ),
  ])

  if (jobError || !job || rowsError) {
    return {
      job: null,
      rows: [],
      issueTotals: { warnings: 0, errors: 0 },
    }
  }

  const issueMap = new Map<string, ImportJobIssueRecord[]>()
  if (!issuesError) {
    for (const issue of (issues ?? []) as ImportJobIssueRecord[]) {
      issueMap.set(issue.import_job_row_id, [...(issueMap.get(issue.import_job_row_id) ?? []), issue])
    }
  }

  const typedRows = ((rows ?? []) as ImportJobRowRecord[]).map((row) => ({
    ...row,
    issues: issueMap.get(row.id) ?? [],
  }))

  return {
    job: job as ImportJobRecord,
    rows: typedRows,
    issueTotals: {
      warnings: typedRows.reduce((count, row) => count + (row.issues?.filter((issue) => issue.issue_type === 'warning').length ?? 0), 0),
      errors: typedRows.reduce((count, row) => count + (row.issues?.filter((issue) => issue.issue_type === 'error').length ?? 0), 0),
    },
  }
}

