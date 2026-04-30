'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  FileWarning,
  MoreHorizontal,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { ImportJobDetail, ImportJobIssueRecord, ImportJobRowRecord } from '@/lib/import-jobs'

function statusTone(status: string) {
  switch (status) {
    case 'validated':
    case 'ready':
    case 'completed':
    case 'imported':
      return 'bg-green-100 text-green-700'
    case 'warning':
    case 'completed_with_errors':
      return 'bg-amber-100 text-amber-700'
    case 'error':
    case 'failed':
    case 'skipped':
      return 'bg-red-100 text-red-700'
    case 'validating':
    case 'importing':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function laneLabel(value: string | null) {
  if (!value) return 'Mixed / Not set'
  if (value === 'hiphop') return 'Hip Hop'
  if (value === 'collection') return 'Collection'
  return 'Standard'
}

export function ProductImportDetailClient({ detail }: { detail: ImportJobDetail }) {
  const router = useRouter()
  const { toast } = useToast()
  const [validating, setValidating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [summary, setSummary] = useState({
    status: detail.job?.status ?? 'uploaded',
    validRows: detail.job?.valid_rows ?? 0,
    warningRows: detail.job?.warning_rows ?? 0,
    errorRows: detail.job?.error_rows ?? 0,
    importedRows: detail.job?.imported_rows ?? 0,
    skippedRows: detail.job?.skipped_rows ?? 0,
    notes: detail.job?.notes ?? '',
  })

  const withAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) {
      throw new Error('Admin session not found. Please sign in again and retry.')
    }
    return accessToken
  }

  const refreshDetail = async (message?: string) => {
    setRefreshing(true)
    router.refresh()
    if (message) {
      toast({
        title: 'Refreshed',
        description: message,
      })
    }
    window.setTimeout(() => setRefreshing(false), 400)
  }

  const handleValidate = async () => {
    if (!detail.job) return

    setValidating(true)
    try {
      const accessToken = await withAccessToken()

      const response = await fetch(`/api/product-imports/${detail.job.id}/validate`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Unable to validate this import job.')
      }

      setSummary((current) => ({
        ...current,
        status: payload.item.status,
        validRows: payload.item.validRows,
        warningRows: payload.item.warningRows,
        errorRows: payload.item.errorRows,
        notes:
          payload.item.status === 'ready'
            ? 'Validation completed. Refresh this page to review the latest row details and issues.'
            : 'Validation found no rows ready for import yet. Refresh this page to inspect the issues.',
      }))

      toast({
        title: 'Validation completed',
        description: `${payload.item.validRows} valid, ${payload.item.warningRows} warning, ${payload.item.errorRows} error rows. Reloading latest review data now.`,
      })
      await refreshDetail()
    } catch (error) {
      toast({
        title: 'Validation failed',
        description: error instanceof Error ? error.message : 'Unable to validate this import job.',
        variant: 'destructive',
      })
    } finally {
      setValidating(false)
    }
  }

  const handleExecute = async () => {
    if (!detail.job) return

    setExecuting(true)
    try {
      const accessToken = await withAccessToken()

      const response = await fetch(`/api/product-imports/${detail.job.id}/execute`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Unable to execute this import job.')
      }

      setSummary((current) => ({
        ...current,
        status: payload.item.status,
        importedRows: payload.item.importedRows,
        skippedRows: payload.item.skippedRows,
        notes:
          payload.item.status === 'completed'
            ? 'Execution finished successfully. Refresh this page to see imported row states.'
            : 'Execution finished with skipped rows. Refresh this page to inspect execution issues.',
      }))

      toast({
        title: 'Execution completed',
        description: `${payload.item.importedRows} products imported as drafts, ${payload.item.skippedRows} rows skipped. Reloading latest review data now.`,
      })
      await refreshDetail()
    } catch (error) {
      toast({
        title: 'Execution failed',
        description: error instanceof Error ? error.message : 'Unable to execute this import job.',
        variant: 'destructive',
      })
    } finally {
      setExecuting(false)
    }
  }

  const handleRetryReset = async () => {
    if (!detail.job) return

    setRetrying(true)
    try {
      const accessToken = await withAccessToken()
      const response = await fetch(`/api/product-imports/${detail.job.id}/retry`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Unable to reset skipped rows for retry.')
      }

      setSummary((current) => ({
        ...current,
        status: payload.item.status,
        notes:
          payload.item.resetRows > 0
            ? 'Some skipped rows were reset for retry. Reloading latest review data now.'
            : 'No skipped rows were reset because blocking issues still remain.',
      }))

      toast({
        title: 'Retry preparation completed',
        description: `${payload.item.resetRows} row(s) reset for retry, ${payload.item.blockedRows} row(s) still blocked.`,
      })
      await refreshDetail()
    } catch (error) {
      toast({
        title: 'Retry preparation failed',
        description: error instanceof Error ? error.message : 'Unable to reset skipped rows for retry.',
        variant: 'destructive',
      })
    } finally {
      setRetrying(false)
    }
  }

  const handleExportIssues = async () => {
    if (!detail.job) return

    setExporting(true)
    try {
      const accessToken = await withAccessToken()
      const response = await fetch(`/api/product-imports/${detail.job.id}/issues`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to export issues.')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/i)
      const fileName = match?.[1] || `import-${detail.job.id}-issues.csv`

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      toast({
        title: 'Issue report downloaded',
        description: 'The current row issues were exported as a CSV report.',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unable to export issues.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  const executePrimary = summary.status === 'ready'

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/product-imports" className="text-sm text-muted-foreground hover:text-foreground">
            Back to import hub
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-jakarta text-3xl font-semibold text-foreground">
              {detail.job?.job_name || detail.job?.csv_file_name || 'Import Job Detail'}
            </h1>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(summary.status)}`}>
              {summary.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>Lane: {laneLabel(detail.job?.lane ?? null)}</span>
            <span>Total rows: {detail.job?.total_rows ?? 0}</span>
            <span>Updated: {formatDate(detail.job?.updated_at ?? null)}</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Validate staged rows first, then import the ready ones. Skipped and error rows can be reviewed row by row below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {executePrimary ? (
            <>
              <button
                type="button"
                onClick={() => void handleValidate()}
                disabled={validating || executing || retrying}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <ShieldCheck size={16} />
                {validating ? 'Validating...' : 'Run Validation'}
              </button>
              <button
                type="button"
                onClick={() => void handleExecute()}
                disabled={executing || validating || retrying}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                {executing ? 'Importing...' : 'Import Ready Rows'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleValidate()}
                disabled={validating || executing || retrying}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <ShieldCheck size={16} />
                {validating ? 'Validating...' : 'Run Validation'}
              </button>
              <button
                type="button"
                onClick={() => void handleExecute()}
                disabled={executing || validating || retrying || summary.status !== 'ready'}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                {executing ? 'Importing...' : 'Import Ready Rows'}
              </button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-foreground transition-colors hover:bg-secondary"
                aria-label="More actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void refreshDetail('Latest job data has been reloaded from the server.')}>
                <RefreshCcw size={16} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExportIssues()} disabled={exporting || validating || executing}>
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export Issues'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleRetryReset()} disabled={retrying || validating || executing}>
                <RefreshCcw size={16} />
                {retrying ? 'Preparing Retry...' : 'Reset Skipped'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <section className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SnapshotItem label="CSV / Workbook" value={detail.job?.csv_file_name || 'Not uploaded'} />
          <SnapshotItem label="ZIP Archive" value={detail.job?.zip_file_name || 'Not uploaded'} />
          <SnapshotItem label="Created" value={formatDate(detail.job?.created_at ?? null)} />
          <SnapshotItem label="Notes" value={summary.notes || detail.job?.notes || 'No notes yet.'} />
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-[0.6fr_1.4fr]">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <FileWarning size={18} className="text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Validation Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <IssueStatCard title="Warnings" value={detail.issueTotals.warnings} tone="bg-amber-50 text-amber-900" />
            <IssueStatCard title="Errors" value={detail.issueTotals.errors} tone="bg-red-50 text-red-900" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <CountCard label="Valid" value={summary.validRows} tone="bg-green-50 text-green-900" />
          <CountCard label="Warning" value={summary.warningRows} tone="bg-amber-50 text-amber-900" />
          <CountCard label="Error" value={summary.errorRows} tone="bg-red-50 text-red-900" />
          <CountCard label="Imported" value={summary.importedRows} tone="bg-blue-50 text-blue-900" />
          <CountCard label="Skipped" value={summary.skippedRows} tone="bg-slate-100 text-slate-900" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <AlertTriangle size={18} className="text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Row Review</h2>
        </div>

        {detail.rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-8">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">No staged rows found</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This import job does not have any staged rows yet. Run a new staging upload or reload the job if this looks unexpected.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {detail.rows.map((row) => (
              <RowCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  )
}

function CountCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl p-5 shadow-sm ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function IssueStatCard({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl p-4 ${tone}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  )
}

function RowCard({ row }: { row: ImportJobRowRecord }) {
  const [open, setOpen] = useState(false)
  const errors = row.issues?.filter((issue) => issue.issue_type === 'error') ?? []
  const warnings = row.issues?.filter((issue) => issue.issue_type === 'warning') ?? []
  const issueSummary =
    errors.length === 0 && warnings.length === 0
      ? 'No issues'
      : [errors.length ? `${errors.length} error${errors.length > 1 ? 's' : ''}` : null, warnings.length ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : null]
          .filter(Boolean)
          .join(', ')

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl bg-secondary/10">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-foreground">
                  Row {row.row_number}: {row.product_name || 'Untitled product'}
                </p>
                <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${statusTone(row.status)}`}>
                  {row.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                SKU: {row.sku || 'Missing'} | Lane: {row.lane || 'Missing'}
              </p>
              <p className="mt-2 text-sm text-foreground">{issueSummary}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.import_message || 'Pending validation.'}</p>
            </div>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-foreground shadow-sm">
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="grid grid-cols-1 gap-4 px-4 pb-4 xl:grid-cols-2">
            <IssueList title="Errors" emptyText="No blocking errors." issues={errors} tone="bg-red-50 text-red-900" />
            <IssueList title="Warnings" emptyText="No warnings." issues={warnings} tone="bg-amber-50 text-amber-900" />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function IssueList({
  title,
  issues,
  emptyText,
  tone,
}: {
  title: string
  issues: ImportJobIssueRecord[]
  emptyText: string
  tone: string
}) {
  return (
    <div className={`rounded-xl p-4 ${tone}`}>
      <div className="text-sm font-semibold">{title}</div>
      {issues.length === 0 ? (
        <div className="mt-3 text-sm opacity-80">{emptyText}</div>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6">
          {issues.map((issue) => (
            <li key={issue.id}>
              {issue.message}
              {issue.field_name ? <span className="ml-1 opacity-80">({issue.field_name})</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
