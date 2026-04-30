'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Lock,
  UploadCloud,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { ProductImportColumn } from '@/lib/product-import-templates'

const DOWNLOAD_ITEMS = [
  {
    title: 'Smart Excel Template',
    description: 'Best for clients. It includes row-by-row dropdowns from your live master tables.',
    href: '/api/product-imports/templates/excel-template',
    primary: true,
  },
  {
    title: 'Blank CSV Template',
    description: 'Fallback if the client cannot use Excel.',
    href: '/api/product-imports/templates/blank-csv',
  },
  {
    title: 'Sample CSV',
    description: 'Use this to understand how example rows should look.',
    href: '/api/product-imports/templates/sample-csv',
  },
  {
    title: 'Image Naming Guide',
    description: 'Simple guide for naming images before zipping.',
    href: '/api/product-imports/templates/image-guide',
  },
]

const GUIDE_STEPS = [
  {
    title: 'Download the template',
    description: 'Use the Smart Excel Template so every row already has dropdowns from your live master data.',
  },
  {
    title: 'Fill one row per product',
    description: 'The client fills only business fields. Shipping, care, and many internal toggles are set automatically.',
  },
  {
    title: 'Zip the images once',
    description: 'Image files stay simple. The workbook only needs file names like SKU_main.jpg and SKU_side.jpg.',
  },
  {
    title: 'Upload workbook and ZIP',
    description: 'The system stages both files safely first. No live product is created at this point.',
  },
  {
    title: 'Run validation',
    description: 'Validation checks category names, options, materials, images, and duplicate problems before import.',
  },
  {
    title: 'Import, then publish',
    description: 'Valid products import as drafts first. After review, drafts can be marked active from Products.',
  },
]

export function ProductImportWizardClient({ columns }: { columns: ProductImportColumn[] }) {
  const { toast } = useToast()
  const requiredColumns = columns.filter((column) => column.group === 'required')
  const optionalColumns = columns.filter((column) => column.group === 'optional')
  const workbookInputRef = useRef<HTMLInputElement | null>(null)
  const zipInputRef = useRef<HTMLInputElement | null>(null)
  const [jobName, setJobName] = useState('')
  const [lane, setLane] = useState<'mixed' | 'standard' | 'hiphop' | 'collection'>('mixed')
  const [dataFile, setDataFile] = useState<File | null>(null)
  const [archiveFile, setArchiveFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stagedResult, setStagedResult] = useState<{
    id: string
    status: string
    lane: string | null
    totalRows: number
    csvFileName: string
    archiveFileName: string | null
  } | null>(null)

  const handleCreateStagingJob = async () => {
    if (!dataFile) {
      toast({
        title: 'Import file required',
        description: 'Please choose the product workbook or CSV file before creating the staging job.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      if (!accessToken) {
        throw new Error('Admin session not found. Please sign in again and retry.')
      }

      const formData = new FormData()
      formData.append('csv_file', dataFile)
      if (archiveFile) {
        formData.append('asset_archive', archiveFile)
      }
      if (jobName.trim()) {
        formData.append('job_name', jobName.trim())
      }
      if (lane !== 'mixed') {
        formData.append('lane', lane)
      }

      const response = await fetch('/api/product-imports/jobs', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Unable to create staging job.')
      }

      setStagedResult(payload.item)
      toast({
        title: 'Staging job created',
        description: `${payload.item.totalRows} rows were staged safely.`,
      })
    } catch (error) {
      toast({
        title: 'Staging failed',
        description: error instanceof Error ? error.message : 'Unable to create staging job.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const clearDataFile = () => {
    setDataFile(null)
    if (workbookInputRef.current) {
      workbookInputRef.current.value = ''
    }
  }

  const clearArchiveFile = () => {
    setArchiveFile(null)
    if (zipInputRef.current) {
      zipInputRef.current.value = ''
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">New Bulk Import</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Download the workbook, fill one row per product, upload the workbook and image ZIP, then validate before import.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GuideDialog requiredCount={requiredColumns.length} optionalCount={optionalColumns.length} />
          <FieldGuideDialog requiredColumns={requiredColumns} optionalColumns={optionalColumns} />
          <Link
            href="/dashboard/product-imports"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Back to Import Hub
          </Link>
        </div>
      </div>

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Download size={18} className="text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Step 1: Download The Main File</h2>
          </div>

          <a
            href={DOWNLOAD_ITEMS[0].href}
            className="flex items-center justify-between gap-4 rounded-xl bg-primary px-5 py-5 text-white transition-colors hover:bg-primary/90"
          >
            <div>
              <p className="text-base font-semibold">{DOWNLOAD_ITEMS[0].title}</p>
              <p className="mt-2 text-sm leading-6 text-white/80">{DOWNLOAD_ITEMS[0].description}</p>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <Download size={18} />
            </span>
          </a>

          <div className="mt-5 rounded-xl bg-secondary/10 p-4">
            <p className="text-sm font-semibold text-foreground">Other downloads</p>
            <div className="mt-3 space-y-3">
              {DOWNLOAD_ITEMS.slice(1).map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  className="flex items-start justify-between gap-4 rounded-lg bg-white px-4 py-3 text-sm transition-colors hover:bg-secondary/40"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-muted-foreground">{item.description}</p>
                  </div>
                  <Download size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Lock size={18} className="text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Auto Defaults</h2>
          </div>

          <div className="space-y-3">
            <MiniRule text="Shipping and care & warranty rules are applied automatically from active master records." />
            <MiniRule text="Collection products stay enquiry-first and checkout stays disabled automatically." />
            <MiniRule text="Base price is derived from purity pricing automatically." />
            <MiniRule text="Imported products start as drafts, so nothing goes live before review." />
          </div>
        </div>
      </section>

      {stagedResult ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-8 shadow-sm">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-green-950">Upload staged successfully</h2>
            <p className="mt-3 text-sm leading-6 text-green-900/80">
              {stagedResult.totalRows} product rows were staged safely. Your next step is to open the import hub, run validation, and then import the ready rows.
            </p>

            <div className="mt-6 grid w-full grid-cols-1 gap-3 rounded-xl bg-white p-5 text-left md:grid-cols-2">
              <SuccessStat label="Rows staged" value={String(stagedResult.totalRows)} />
              <SuccessStat label="Workbook" value={stagedResult.csvFileName} />
              <SuccessStat label="ZIP" value={stagedResult.archiveFileName || 'Not uploaded'} />
              <SuccessStat label="Status" value={stagedResult.status.replace(/_/g, ' ')} />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/product-imports"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Go To Import Hub
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStagedResult(null)
                  setJobName('')
                  setLane('mixed')
                  clearDataFile()
                  clearArchiveFile()
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Stage Another File
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <UploadCloud size={18} className="text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Step 2: Upload & Stage</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Job Name</label>
                <input
                  value={jobName}
                  onChange={(event) => setJobName(event.target.value)}
                  placeholder="Example: April bridal batch"
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Lane</label>
                <select
                  value={lane}
                  onChange={(event) => setLane(event.target.value as 'mixed' | 'standard' | 'hiphop' | 'collection')}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="mixed">Mixed or auto-detect from workbook</option>
                  <option value="standard">Standard only</option>
                  <option value="hiphop">Hip Hop only</option>
                  <option value="collection">Collection only</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Product Workbook or CSV</label>
                <input
                  ref={workbookInputRef}
                  type="file"
                  accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => setDataFile(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {dataFile ? (
                  <SelectedFileRow file={dataFile} onRemove={clearDataFile} />
                ) : (
                  <button
                    type="button"
                    onClick={() => workbookInputRef.current?.click()}
                    className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-secondary/10 px-4 py-4 text-left transition-colors hover:bg-secondary/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">Choose workbook</p>
                      <p className="mt-1 text-sm text-muted-foreground">Upload the Smart Excel Template directly, or use CSV as a fallback.</p>
                    </div>
                    <FileSpreadsheet size={18} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Image ZIP</label>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(event) => setArchiveFile(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {archiveFile ? (
                  <SelectedFileRow file={archiveFile} onRemove={clearArchiveFile} />
                ) : (
                  <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-secondary/10 px-4 py-4 text-left transition-colors hover:bg-secondary/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">Choose ZIP archive</p>
                      <p className="mt-1 text-sm text-muted-foreground">Optional here, but recommended for image matching during validation and import.</p>
                    </div>
                    <UploadCloud size={18} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void handleCreateStagingJob()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  <UploadCloud size={16} />
                  {submitting ? 'Uploading & staging...' : 'Upload & Stage'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Info size={18} className="text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground">What Happens Next</h2>
              </div>

              <div className="space-y-3">
                <QuickStep number="1" text="Fill the workbook with one row for each product." />
                <QuickStep number="2" text="Upload the workbook and ZIP on this page." />
                <QuickStep number="3" text="Open the import hub and run validation." />
                <QuickStep number="4" text="Import the ready rows, then review the draft products." />
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-secondary/5 p-6 text-sm text-muted-foreground shadow-sm">
              <div className="flex items-start gap-3">
                <HelpCircle size={18} className="mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Need a quick learning path?</p>
                  <p className="mt-2 leading-6">
                    Use <span className="font-medium text-foreground">Step-by-Step Help</span> for the guided explanation and
                    <span className="font-medium text-foreground"> View Field Guide</span> when the client needs column-by-column help.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function GuideDialog({
  requiredCount,
  optionalCount,
}: {
  requiredCount: number
  optionalCount: number
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <HelpCircle size={16} />
          Step-by-Step Help
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Guide</DialogTitle>
          <DialogDescription>
            Learn the flow one step at a time. The main page stays simple, and the full guidance lives here when needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {GUIDE_STEPS.map((step, index) => (
            <div key={step.title} className="rounded-xl bg-secondary/10 p-4">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-foreground shadow-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <GuideNote
            title="Image naming"
            body="Use simple names like SKU_main.jpg, SKU_side.jpg, SKU_top.jpg, and SKU_detail.jpg."
          />
          <GuideNote
            title="Field count"
            body={`${requiredCount} required fields and ${optionalCount} optional fields are currently supported.`}
          />
          <GuideNote
            title="Auto defaults"
            body="Shipping, care & warranty, and several internal flags are applied automatically by the system."
          />
          <GuideNote
            title="Safe publishing"
            body="Imported products come in as drafts first, so the team can review before anything becomes visible on the website."
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FieldGuideDialog({
  requiredColumns,
  optionalColumns,
}: {
  requiredColumns: ProductImportColumn[]
  optionalColumns: ProductImportColumn[]
}) {
  const groups = [
    {
      title: `Required Fields (${requiredColumns.length})`,
      tone: 'bg-green-50',
      columns: requiredColumns,
    },
    {
      title: `Optional Fields (${optionalColumns.length})`,
      tone: 'bg-amber-50',
      columns: optionalColumns,
    },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <FileSpreadsheet size={16} />
          View Field Guide
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workbook Field Guide</DialogTitle>
          <DialogDescription>
            These are the columns the importer expects. Use this only when the client needs column help.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {groups.map((group) => (
            <div key={group.title} className={`rounded-xl p-4 ${group.tone}`}>
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <div className="mt-4 space-y-3">
                {group.columns.map((column) => (
                  <div key={column.key} className="rounded-lg bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{column.label}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{column.key}</p>
                      </div>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                        {column.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{column.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Example: <span className="font-medium text-foreground">{column.example}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MiniRule({ text }: { text: string }) {
  return <div className="rounded-xl bg-secondary/10 p-4 text-sm leading-6 text-muted-foreground">{text}</div>
}

function QuickStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-secondary/10 p-4">
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-foreground shadow-sm">
        {number}
      </div>
      <p className="text-sm leading-6 text-foreground">{text}</p>
    </div>
  )
}

function SelectedFileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-green-50 px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-green-900">File selected</p>
        <p className="mt-1 truncate text-sm text-green-900/75">{file.name}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 transition-colors hover:bg-green-100 hover:text-foreground"
        aria-label={`Remove ${file.name}`}
      >
        <X size={16} />
      </button>
    </div>
  )
}

function GuideNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-secondary/10 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

function SuccessStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
