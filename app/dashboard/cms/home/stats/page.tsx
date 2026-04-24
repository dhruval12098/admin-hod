'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type StatItem = {
  clientId: string
  id?: number
  sort_order: number
  target: number
  suffix: string
  label: string
}

type ApiPayload = {
  items?: Array<{
    id?: number
    sort_order: number
    target: number
    suffix: string
    label: string
  }>
  error?: string
}

const emptyItem = (sort_order: number): StatItem => ({
  clientId: `draft-${Date.now()}-${sort_order}`,
  sort_order,
  target: 0,
  suffix: '+',
  label: '',
})

export default function StatsEditor() {
  const { toast } = useToast()
  const [stats, setStats] = useState<StatItem[]>([])
  const [loadStatus, setLoadStatus] = useState('Loading Statistics Strip...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<StatItem | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setLoadStatus('You are not signed in.')
        return
      }

      const response = await fetch('/api/cms/home/stats', {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const payload = (await response.json().catch(() => null)) as ApiPayload | null
      if (!response.ok) {
        setLoadStatus(payload?.error ?? 'Unable to load Statistics Strip.')
        return
      }

      setStats((payload?.items ?? []).map((item) => ({ clientId: `id-${item.id ?? item.sort_order}`, ...item })))
      setLoadStatus(payload?.items?.length ? 'Statistics Strip loaded' : 'No statistics rows found yet')
    }

    load()
  }, [])

  const openEditor = (item?: StatItem) => {
    setEditorItem(item ?? emptyItem(stats.length + 1))
    setEditorOpen(true)
  }

  const handleSaveEditor = () => {
    if (!editorItem) return
    setStats((prev) => {
      const exists = prev.some((item) => item.clientId === editorItem.clientId)
      return exists ? prev.map((item) => (item.clientId === editorItem.clientId ? editorItem : item)) : [...prev, editorItem]
    })
    setEditorOpen(false)
  }

  const handleSave = () => setConfirmOpen(true)

  const confirmSave = async () => {
    setIsSaving(true)
    setConfirmOpen(false)

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setIsSaving(false)
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/stats', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: stats.map(({ sort_order, target, suffix, label }) => ({ sort_order, target, suffix, label })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Statistics Strip.')
      return
    }

    setLoadStatus('Statistics Strip saved')
    toast({ title: 'Saved', description: 'Statistics Strip updated successfully.' })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Statistics Strip</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the counters shown on the homepage</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => openEditor()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus size={16} />
          Add Stat
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Target</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Suffix</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Label</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((item) => (
              <tr key={item.clientId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.target.toLocaleString('en-US')}</td>
                <td className="px-5 py-4 text-sm">{item.suffix}</td>
                <td className="px-5 py-4 text-sm">{item.label}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => openEditor(item)}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => setStats((prev) => prev.filter((x) => x.clientId !== item.clientId))}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CmsSaveAction onClick={handleSave} isSaving={isSaving} />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save Statistics Strip?"
        description="This will update the homepage counters."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={confirmSave}
        onCancel={() => setConfirmOpen(false)}
      />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Stat</DialogTitle>
            <DialogDescription>Update the counter target, suffix, and label.</DialogDescription>
          </DialogHeader>

          {editorItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Order</label>
                  <input
                    type="number"
                    value={editorItem.sort_order}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditorItem((prev) => (prev ? { ...prev, sort_order: Number(e.target.value) } : prev))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Target</label>
                  <input
                    type="number"
                    value={editorItem.target}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditorItem((prev) => (prev ? { ...prev, target: Number(e.target.value) } : prev))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Suffix</label>
                  <input
                    type="text"
                    value={editorItem.suffix}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditorItem((prev) => (prev ? { ...prev, suffix: e.target.value } : prev))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Label</label>
                <input
                  type="text"
                  value={editorItem.label}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, label: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEditor}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Update Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
