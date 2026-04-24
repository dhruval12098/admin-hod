'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, RefreshCcw, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type MediaItem = {
  path: string
  name: string
  url: string
  status: 'used' | 'unused'
  referencedBy: string[]
}

type MediaSection = {
  name: string
  total: number
  used: number
  unused: number
  items: MediaItem[]
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export default function MediaTrashPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sections, setSections] = useState<MediaSection[]>([])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [deletingPath, setDeletingPath] = useState<string | null>(null)

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

  const loadData = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true)
    if (mode === 'refresh') setRefreshing(true)

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
      setOpenSections((current) => {
        const next = { ...current }
        for (const section of nextSections) {
          if (!(section.name in next)) {
            next[section.name] = false
          }
        }
        return next
      })
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Unable to scan storage bucket.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData('initial')
  }, [])

  const handleDelete = async (path: string) => {
    const confirmed = window.confirm('This will permanently delete the file from the Supabase bucket. This cannot be undone. Continue?')
    if (!confirmed) return

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
      await loadData('refresh')
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete file.',
        variant: 'destructive',
      })
    } finally {
      setDeletingPath(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Media Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review bucket assets, see where they are used, and permanently delete files marked unused.</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Total files: {totals.total} · Used: {totals.used} · Unused: {totals.unused}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData('refresh')}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-6 py-10 text-sm text-muted-foreground">Scanning storage bucket...</div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.name} className="overflow-hidden rounded-2xl border border-border bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setOpenSections((current) => ({ ...current, [section.name]: !current[section.name] }))}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div>
                  <div className="font-jakarta text-lg font-semibold text-foreground">{section.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {section.total} files · {section.used} used · {section.unused} unused
                  </div>
                </div>
                <ChevronDown size={18} className={`transition-transform ${openSections[section.name] ? 'rotate-180' : ''}`} />
              </button>

              {openSections[section.name] ? (
                <div className="border-t border-border px-5 py-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {section.items.map((item) => {
                      const isImage = /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(item.path)
                      return (
                        <article key={item.path} className="overflow-hidden rounded-2xl border border-border bg-secondary/10">
                          <div className="relative aspect-[4/3] bg-white">
                            {isImage ? (
                              <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                Preview not available
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">{item.name}</div>
                                <div className="mt-1 truncate text-xs text-muted-foreground">{item.path}</div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                  item.status === 'used'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>

                            <div className="text-xs leading-5 text-muted-foreground">
                              {item.referencedBy.length > 0 ? `Referenced by: ${item.referencedBy.join(', ')}` : 'No database references found.'}
                            </div>

                            {item.status === 'unused' ? (
                              <button
                                type="button"
                                onClick={() => void handleDelete(item.path)}
                                disabled={deletingPath === item.path}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 size={15} />
                                {deletingPath === item.path ? 'Deleting...' : 'Delete Permanently'}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
