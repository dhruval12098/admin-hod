'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TablePagination } from '@/components/table-pagination'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export type MediaItem = {
  path: string
  name: string
  url: string
  status: 'used' | 'unused'
  referencedBy: string[]
}

export type MediaSection = {
  name: string
  total: number
  used: number
  unused: number
  items: MediaItem[]
}

const PAGE_SIZE = 20

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function isImageFile(path: string) {
  return /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(path)
}

export function MediaTrashClient({ initialSections }: { initialSections: MediaSection[] }) {
  const { toast } = useToast()
  const [refreshing, setRefreshing] = useState(false)
  const [sections, setSections] = useState<MediaSection[]>(initialSections)
  const [activeSectionName, setActiveSectionName] = useState<string>(initialSections[0]?.name ?? '')
  const [showUnusedOnly, setShowUnusedOnly] = useState(true)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const totals = useMemo(() => {
    return sections.reduce(
      (acc, section) => {
        acc.total += section.total
        acc.used += section.used
        acc.unused += section.unused
        return acc
      },
      { total: 0, used: 0, unused: 0 }
    )
  }, [sections])

  const activeSection = useMemo(
    () => sections.find((section) => section.name === activeSectionName) ?? sections[0] ?? null,
    [activeSectionName, sections]
  )

  const visibleItems = useMemo(() => {
    if (!activeSection) return []
    return showUnusedOnly ? activeSection.items.filter((item) => item.status === 'unused') : activeSection.items
  }, [activeSection, showUnusedOnly])

  const paginatedItems = useMemo(() => {
    return visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  }, [page, visibleItems])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE))
    if (page > totalPages) {
      setPage(1)
    }
  }, [page, visibleItems.length])

  const loadData = async () => {
    setRefreshing(true)

    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Missing access token.')

      const response = await fetch('/api/storage/trash', {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to scan storage bucket.')
      }

      const nextSections = Array.isArray(payload?.sections) ? payload.sections : []
      setSections(nextSections)
      setActiveSectionName((current) => {
        if (current && nextSections.some((section: MediaSection) => section.name === current)) return current
        return nextSections[0]?.name ?? ''
      })
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Unable to scan storage bucket.',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleDelete = async (path: string) => {
    setDeletingPath(path)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Missing access token.')

      const response = await fetch('/api/storage/trash', {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ path }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to delete file.')
      }

      toast({ title: 'Deleted', description: 'Unused file deleted permanently.' })
      await loadData()
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete file.',
        variant: 'destructive',
      })
    } finally {
      setDeletingPath(null)
      setPendingDeletePath(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Media Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review bucket assets, grouped by folder, and permanently delete files marked unused.</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Total files: {totals.total} · Used: {totals.used} · Unused: {totals.unused}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const isActive = activeSection?.name === section.name

            return (
              <button
                key={section.name}
                type="button"
                onClick={() => {
                  setActiveSectionName(section.name)
                  setPage(1)
                }}
                className={`rounded-2xl border p-6 text-left transition-all ${
                  isActive
                    ? 'border-primary bg-secondary/30 shadow-sm'
                    : 'border-border bg-white hover:border-primary/40 hover:bg-secondary/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-jakarta text-xl font-semibold text-foreground">{section.name}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{section.total} files in this folder block</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      isActive ? 'bg-primary text-white' : 'bg-secondary text-foreground'
                    }`}
                  >
                    Open
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Used: {section.used}
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    Unused: {section.unused}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {activeSection ? (
          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <h3 className="font-jakarta text-xl font-semibold text-foreground">{activeSection.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {showUnusedOnly
                    ? `${activeSection.unused} unused image${activeSection.unused === 1 ? '' : 's'} in this section`
                    : `${activeSection.total} total file${activeSection.total === 1 ? '' : 's'} in this section`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnusedOnly(true)
                    setPage(1)
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    showUnusedOnly ? 'bg-primary text-white' : 'border border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  Show Unused
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnusedOnly(false)
                    setPage(1)
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    !showUnusedOnly ? 'bg-primary text-white' : 'border border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  Show All Images
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/10">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preview</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">File</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Used In</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((item) => (
                      <tr key={item.path} className="border-b border-border last:border-b-0">
                        <td className="px-6 py-4 align-top">
                          <div className="h-16 w-16 overflow-hidden rounded-xl border border-border bg-secondary/10">
                            {isImageFile(item.path) ? (
                              <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                                No preview
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="max-w-[420px]">
                            <div className="text-sm font-semibold text-foreground">{item.name}</div>
                            <div className="mt-1 break-all text-xs text-muted-foreground">{item.path}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                              item.status === 'used'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="max-w-[320px] text-sm text-muted-foreground">
                            {item.referencedBy.length > 0 ? item.referencedBy.join(', ') : 'No database references found'}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-right">
                          {item.status === 'unused' ? (
                            <button
                              type="button"
                              onClick={() => setPendingDeletePath(item.path)}
                              disabled={deletingPath === item.path}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 size={15} />
                              {deletingPath === item.path ? 'Deleting...' : 'Delete'}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No files found for this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalItems={visibleItems.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeletePath)}
        title="Delete file permanently?"
        description="This will permanently delete the file from the Supabase bucket. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        isLoading={Boolean(deletingPath)}
        onConfirm={() => {
          if (pendingDeletePath) void handleDelete(pendingDeletePath)
        }}
        onCancel={() => {
          if (!deletingPath) setPendingDeletePath(null)
        }}
      />
    </div>
  )
}
