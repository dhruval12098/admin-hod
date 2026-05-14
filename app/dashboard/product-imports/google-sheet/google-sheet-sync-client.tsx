'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Link2, RefreshCcw, TableProperties } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

const TAB_OPTIONS = [
  { value: 'Ring_Final', label: 'Ring_Final' },
  { value: 'Earring_Final', label: 'Earring_Final' },
  { value: 'Pendant_Final', label: 'Pendant_Final' },
  { value: 'BrcBg', label: 'BrcBg' },
] as const

const STORAGE_KEYS = {
  sheetUrl: 'hod_google_sync_sheet_url',
  tabName: 'hod_google_sync_tab_name',
  lane: 'hod_google_sync_lane',
} as const

type ConnectedSource = {
  id: string
  name: string
  sheetUrl: string
  spreadsheetId: string
  tabName: string
  lane: 'mixed' | 'standard' | 'hiphop' | 'collection'
  lastJobId: string | null
  lastStatus: 'staged' | 'up_to_date'
  lastSyncedAt: string
  summary: {
    totalRows: number
    actionableRows: number
    newRows: number
    updatedRows: number
    unchangedRows: number
    noChanges: boolean
  }
}

export function GoogleSheetSyncClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [sheetUrl, setSheetUrl] = useState('')
  const [tabName, setTabName] = useState<string>('Ring_Final')
  const [jobName, setJobName] = useState('')
  const [lane, setLane] = useState<'mixed' | 'standard' | 'hiphop' | 'collection'>('mixed')
  const [submitting, setSubmitting] = useState(false)
  const [createdJobId, setCreatedJobId] = useState<string | null>(null)
  const [availableTabs, setAvailableTabs] = useState<string[]>(TAB_OPTIONS.map((option) => option.value))
  const [supportedTabs, setSupportedTabs] = useState<string[]>(TAB_OPTIONS.map((option) => option.value))
  const [loadingTabs, setLoadingTabs] = useState(false)
  const [editingSource, setEditingSource] = useState(true)
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([])
  const [activeView, setActiveView] = useState<'new' | 'existing'>('new')
  const [syncSummary, setSyncSummary] = useState<{
    totalRows: number
    actionableRows: number
    newRows: number
    updatedRows: number
    unchangedRows: number
    noChanges: boolean
  } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const nextSheetUrl = window.localStorage.getItem(STORAGE_KEYS.sheetUrl) ?? ''
    const nextTabName = window.localStorage.getItem(STORAGE_KEYS.tabName)
    const nextLane = window.localStorage.getItem(STORAGE_KEYS.lane) as 'mixed' | 'standard' | 'hiphop' | 'collection' | null

    if (nextSheetUrl) setSheetUrl(nextSheetUrl)
    if (nextTabName) setTabName(nextTabName)
    if (nextLane && ['mixed', 'standard', 'hiphop', 'collection'].includes(nextLane)) setLane(nextLane)
    if (nextSheetUrl) setEditingSource(false)
  }, [])

  useEffect(() => {
    let active = true

    const loadConnectedSources = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const accessToken = data.session?.access_token
        if (!accessToken) return

        const response = await fetch('/api/product-imports/google-sync?listSources=1', {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload) return

        if (active && Array.isArray(payload.items)) {
          setConnectedSources(payload.items as ConnectedSource[])
          if (payload.items.length > 0) {
            setActiveView('existing')
          }
        }
      } catch {}
    }

    void loadConnectedSources()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sourceKey = searchParams.get('source')
    if (!sourceKey || connectedSources.length < 1) return

    const selected = connectedSources.find((source) => source.id === sourceKey)
    if (!selected) return

    setSheetUrl(selected.sheetUrl)
    setTabName(selected.tabName)
    setLane(selected.lane)
    setCreatedJobId(selected.lastJobId)
    setSyncSummary(selected.summary)
    setEditingSource(false)
    setActiveView('existing')
  }, [searchParams, connectedSources])

  const persistConnectedSource = (source: ConnectedSource) => {
    const nextSources = [
      source,
      ...connectedSources.filter((entry) => entry.id !== source.id),
    ].slice(0, 12)

    setConnectedSources(nextSources)
  }

  const loadTabs = async (nextSheetUrl?: string) => {
    const targetUrl = (nextSheetUrl ?? sheetUrl).trim()
    if (!targetUrl) {
      toast({
        title: 'Google Sheet link required',
        description: 'Paste the shared Google Sheet link before loading tabs.',
        variant: 'destructive',
      })
      return
    }

    setLoadingTabs(true)
    try {
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      if (!accessToken) throw new Error('Admin session not found. Please sign in again and retry.')

      const response = await fetch(`/api/product-imports/google-sync?sheetUrl=${encodeURIComponent(targetUrl)}`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Unable to load Google Sheet tabs.')
      }

      const nextAvailableTabs = Array.isArray(payload.item.tabs) ? payload.item.tabs : []
      const nextSupportedTabs = Array.isArray(payload.item.supportedTabs) ? payload.item.supportedTabs : []

      setAvailableTabs(nextAvailableTabs)
      setSupportedTabs(nextSupportedTabs)

      if (nextSupportedTabs.length > 0 && !nextSupportedTabs.includes(tabName)) {
        setTabName(nextSupportedTabs[0])
      }

      toast({
        title: 'Tabs loaded',
        description:
          nextSupportedTabs.length > 0
            ? `${nextSupportedTabs.length} supported tab(s) are available for sync.`
            : 'Tabs were loaded, but none of them match the currently supported sync format.',
      })
    } catch (error) {
      toast({
        title: 'Tab loading failed',
        description: error instanceof Error ? error.message : 'Unable to read Google Sheet tabs.',
        variant: 'destructive',
      })
    } finally {
      setLoadingTabs(false)
    }
  }

  const handleSync = async () => {
    if (!sheetUrl.trim()) {
      toast({
        title: 'Google Sheet link required',
        description: 'Paste the shared Google Sheet link before starting sync.',
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

      const response = await fetch('/api/product-imports/google-sync', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sheetUrl: sheetUrl.trim(),
          tabName,
          jobName: jobName.trim() || null,
          lane: lane === 'mixed' ? null : lane,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Unable to create Google Sheet sync job.')
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEYS.sheetUrl, sheetUrl.trim())
        window.localStorage.setItem(STORAGE_KEYS.tabName, tabName)
        window.localStorage.setItem(STORAGE_KEYS.lane, lane)
      }
      setEditingSource(false)

      setCreatedJobId(payload.item.id)
      setSyncSummary({
        totalRows: Number(payload.item.totalRows ?? 0),
        actionableRows: Number(payload.item.actionableRows ?? 0),
        newRows: Number(payload.item.newRows ?? 0),
        updatedRows: Number(payload.item.updatedRows ?? 0),
        unchangedRows: Number(payload.item.unchangedRows ?? 0),
        noChanges: payload.item.status === 'no_changes',
      })

      if (payload.item.source) {
        persistConnectedSource(payload.item.source as ConnectedSource)
      }

      if (payload.item.status === 'no_changes') {
        toast({
          title: 'No new sync changes',
          description: `We checked ${payload.item.totalRows} row(s). Everything is already up to date, so nothing new was staged.`,
        })
        return
      }

      toast({
        title: 'Google Sheet staged',
        description: `${payload.item.actionableRows} actionable row(s) were staged from ${tabName}.`,
      })
    } catch (error) {
      toast({
        title: 'Google Sheet sync failed',
        description: error instanceof Error ? error.message : 'Unable to stage the Google Sheet rows.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/product-imports" className="text-sm text-muted-foreground hover:text-foreground">
            Back to import hub
          </Link>
          <h1 className="mt-2 font-jakarta text-3xl font-semibold text-foreground">Google Sheet Sync</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Pull one supported tab from the shared Google Sheet, stage those rows into the normal bulk import review flow,
            then validate before importing any product drafts.
          </p>
        </div>
      </div>

      <section className="mb-6 rounded-xl border border-border bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveView('new')
              setEditingSource(true)
              setCreatedJobId(null)
              setSyncSummary(null)
            }}
            className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              activeView === 'new' ? 'bg-primary text-white' : 'bg-transparent text-foreground hover:bg-secondary'
            }`}
          >
            New Sheet
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('existing')
              setEditingSource(false)
              setCreatedJobId(null)
              setSyncSummary(null)
            }}
            className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              activeView === 'existing' ? 'bg-primary text-white' : 'bg-transparent text-foreground hover:bg-secondary'
            }`}
          >
            Sync Existing
          </button>
        </div>
      </section>

      {activeView === 'existing' && !editingSource && sheetUrl.trim() ? (
        <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Connected Sheet</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Sync Latest Changes</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  This sheet is already connected for testing. Use one click to pull only the latest new or updated rows.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sheet</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">{sheetUrl}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tab</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{tabName}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lane</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {lane === 'mixed' ? 'Mixed / Infer from tab' : lane}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setCreatedJobId(null)
                  setSyncSummary(null)
                  void handleSync()
                }}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <RefreshCcw size={16} />
                {submitting ? 'Syncing Latest...' : 'Sync Latest'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {activeView === 'existing' && connectedSources.length > 0 ? (
        <section className="mb-6 rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Latest Syncs</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Open an existing connected sheet, sync the latest changes, or check whether it is already up to date.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Sheet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Tab</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Latest State</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Changes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Updated</th>
                </tr>
              </thead>
              <tbody>
                {connectedSources.map((source) => (
                  <tr
                    key={source.id}
                    className="cursor-pointer border-b border-border/70 last:border-b-0 hover:bg-secondary/20"
                    onClick={() => {
                      router.push(`/dashboard/product-imports/google-sheet?source=${encodeURIComponent(source.id)}`)
                    }}
                  >
                    <td className="px-4 py-3 text-sm text-foreground">
                      <p className="font-medium">{source.name}</p>
                      <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">{source.sheetUrl}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{source.tabName}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                          source.lastStatus === 'up_to_date' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {source.lastStatus === 'up_to_date' ? 'Up to date' : 'New / updated rows found'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {source.summary.newRows} new / {source.summary.updatedRows} updated / {source.summary.unchangedRows} unchanged
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(source.lastSyncedAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {createdJobId || syncSummary?.noChanges ? (
        <section className="rounded-2xl border border-green-200 bg-green-50 p-8 shadow-sm">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-green-950">
              {syncSummary?.noChanges ? 'Google Sheet already up to date' : 'Google Sheet rows staged'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-green-900/80">
              {syncSummary?.noChanges
                ? 'No new or updated rows were found this time, so nothing new was pushed into the pipeline.'
                : 'Only the new and changed rows were moved into the import pipeline. Open the staged sync next, run validation, and review before import.'}
            </p>
            {syncSummary ? (
              <div className="mt-5 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-green-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-900/70">Scanned</p>
                  <p className="mt-1 text-xl font-semibold text-green-950">{syncSummary.totalRows}</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-900/70">New</p>
                  <p className="mt-1 text-xl font-semibold text-green-950">{syncSummary.newRows}</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-900/70">Updated</p>
                  <p className="mt-1 text-xl font-semibold text-green-950">{syncSummary.updatedRows}</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-900/70">Unchanged</p>
                  <p className="mt-1 text-xl font-semibold text-green-950">{syncSummary.unchangedRows}</p>
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {createdJobId ? (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/product-imports/${createdJobId}`)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Open Staged Sync
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setCreatedJobId(null)
                  setJobName('')
                  setSyncSummary(null)
                  setEditingSource(false)
                  setActiveView('existing')
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Run Another Sync
              </button>
            </div>
          </div>
        </section>
      ) : editingSource && activeView === 'new' ? (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <Link2 size={18} className="text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Source Setup</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Google Sheet Link</label>
                <div className="flex gap-2">
                  <input
                    value={sheetUrl}
                    onChange={(event) => setSheetUrl(event.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => void loadTabs()}
                    disabled={loadingTabs}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    {loadingTabs ? 'Loading...' : 'Load Tabs'}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Sheet Tab</label>
                <select
                  value={tabName}
                  onChange={(event) => setTabName(event.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {availableTabs.map((option) => (
                    <option key={option} value={option} disabled={!supportedTabs.includes(option)}>
                      {supportedTabs.includes(option) ? option : `${option} (unsupported right now)`}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Load tabs from the Google Sheet link first. Supported tabs stay selectable; unsupported tabs are shown for visibility.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Job Name</label>
                <input
                  value={jobName}
                  onChange={(event) => setJobName(event.target.value)}
                  placeholder="Example: Google Sheet Ring sync"
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
                  <option value="mixed">Mixed or infer from tab</option>
                  <option value="standard">Standard only</option>
                  <option value="hiphop">Hip Hop only</option>
                  <option value="collection">Collection only</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void handleSync()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  <RefreshCcw size={16} />
                  {submitting ? 'Staging Google Sheet...' : 'Sync & Stage Rows'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <TableProperties size={18} className="text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">What Happens</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>1. We fetch the selected Google Sheet tab as a workbook export.</p>
              <p>2. We map the wide client-format columns into your normal product fields.</p>
              <p>3. We compare SKUs and detect what is new, changed, or already unchanged.</p>
              <p>4. Only the new and changed rows are staged for review.</p>
              <p>5. Image and video URLs can be used directly in phase one, so ZIP-only media is not required for every row.</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
