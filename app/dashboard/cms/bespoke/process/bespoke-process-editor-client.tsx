'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
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
import { supabase } from '@/lib/supabase'

type ProcessItem = {
  clientId: string
  id?: number
  sort_order: number
  eyebrow: string
  title: string
  description: string
}

type EditorItem = ProcessItem

export type BespokeProcessInitialData = {
  items: Array<{
    id: number
    sort_order: number
    eyebrow: string
    title: string
    description: string
  }>
}

const empty = (sortOrder: number): EditorItem => ({
  clientId: `draft-${Date.now()}`,
  sort_order: sortOrder,
  eyebrow: '',
  title: '',
  description: '',
})

export function BespokeProcessEditorClient({ initialData }: { initialData: BespokeProcessInitialData }) {
  const [items, setItems] = useState<ProcessItem[]>(
    initialData.items.map((item) => ({ clientId: `id-${item.id}`, ...item }))
  )
  const [status, setStatus] = useState(initialData.items.length ? 'Bespoke process loaded' : 'No process cards found yet')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<EditorItem>(empty(1))

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)),
    [items]
  )
  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  const saveAll = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setIsSaving(false)
      setStatus('You are not signed in.')
      return
    }
    const response = await fetch('/api/cms/bespoke/process', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: sorted.map(({ sort_order, eyebrow, title, description }) => ({
          sort_order,
          eyebrow,
          title,
          description,
        })),
      }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    setIsSaving(false)
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save bespoke process.')
      return
    }
    setConfirmOpen(false)
    setStatus('Bespoke process saved')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/dashboard/cms/bespoke" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} />
          Back to Bespoke
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-semibold">Process Steps</h1>
        <p className="text-sm text-muted-foreground">Manage the Bespoke process cards section</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Eyebrow</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Title</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.clientId} className="border-b">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.eyebrow}</td>
                <td className="px-5 py-4 text-sm">{item.title}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="rounded-md border px-3 py-2 text-sm"><Edit2 size={14} /></button>
                    <button onClick={() => { setItems((prev) => prev.filter((x) => x.clientId !== item.clientId)); setStatus('Process step removed locally. Save changes to publish.') }} className="rounded-md border px-3 py-2 text-sm"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-sm text-muted-foreground">No process cards found yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <Plus size={16} />
        Add Step
      </button>

      <ConfirmDialog isOpen={confirmOpen} title="Save Bespoke Process?" description="This will update the Bespoke process cards on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={saveAll} onCancel={() => setConfirmOpen(false)} />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step</DialogTitle>
            <DialogDescription>Update eyebrow, title, and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">Eyebrow</label>
              <input value={editorItem.eyebrow} onChange={(e) => setEditorItem((p) => ({ ...p, eyebrow: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Title</label>
              <input value={editorItem.title} onChange={(e) => setEditorItem((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Description</label>
              <textarea value={editorItem.description} onChange={(e) => setEditorItem((p) => ({ ...p, description: e.target.value }))} rows={4} className="w-full rounded-lg border px-3 py-2" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditorOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button>
            <button onClick={() => { setItems((prev) => { const idx = prev.findIndex((x) => x.clientId === editorItem.clientId); if (idx >= 0) { const copy = [...prev]; copy[idx] = editorItem; return copy } return [...prev, editorItem] }); setStatus('Draft updated locally. Save changes to publish.'); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm text-white">Update</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
