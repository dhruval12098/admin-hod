'use client'

import Link from 'next/link'
import { ArrowRight, Clock3, FileSpreadsheet, PlusCircle } from 'lucide-react'
import type { ImportJobsOverview, ImportJobRecord } from '@/lib/import-jobs'

function formatJobDate(value: string | null) {
  if (!value) return 'Not started'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatLane(lane: ImportJobRecord['lane']) {
  if (!lane) return 'Mixed / Not set'
  if (lane === 'hiphop') return 'Hip Hop'
  if (lane === 'collection') return 'Collection'
  return 'Standard'
}

function statusTone(status: ImportJobRecord['status']) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'ready':
      return 'bg-blue-100 text-blue-700'
    case 'completed_with_errors':
      return 'bg-amber-100 text-amber-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'importing':
    case 'parsing':
    case 'validating':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-secondary text-foreground'
  }
}

export function ProductImportsClient({ overview }: { overview: ImportJobsOverview }) {
  const hasJobs = overview.jobs.length > 0

  return (
    <div className="p-8">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Bulk Product Imports</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Start a new workbook import, or reopen an earlier job to validate and import its rows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/product-imports/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <PlusCircle size={16} />
            Start Import Setup
          </Link>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Back to Products
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard label="Recent Jobs" value={overview.totals.totalJobs} hint="Latest import sessions visible here." />
        <OverviewCard label="Active Jobs" value={overview.totals.activeJobs} hint="Uploaded, validating, ready, or importing." />
        <OverviewCard label="Ready To Import" value={overview.totals.readyJobs} hint="Validated and waiting for execution." />
        <OverviewCard label="Needs Attention" value={overview.totals.failedJobs} hint="Failed or completed with row issues." />
      </section>

      {!hasJobs ? (
        <section className="rounded-xl border border-border bg-white p-10 shadow-sm">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20 text-foreground">
              <FileSpreadsheet size={26} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-foreground">Start your first import</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Download the Smart Excel Template, fill one row per product, upload the workbook and image ZIP, then validate before import.
            </p>
            <Link
              href="/dashboard/product-imports/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Start Import Setup
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Clock3 size={18} className="text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Recent Import Jobs</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Job</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Lane</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Rows</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Updated</th>
                </tr>
              </thead>
              <tbody>
                {overview.jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-foreground">
                      <Link href={`/dashboard/product-imports/${job.id}`} className="font-medium hover:underline">
                        {job.job_name || job.csv_file_name || 'Untitled import job'}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">{job.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatLane(job.lane)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${statusTone(job.status)}`}>
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {job.imported_rows ?? 0} imported / {job.total_rows ?? 0} total
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatJobDate(job.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function OverviewCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-jakarta text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
