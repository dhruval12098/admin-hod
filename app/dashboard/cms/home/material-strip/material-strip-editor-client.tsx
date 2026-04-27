'use client'

import Link from 'next/link'
import { useState, type ChangeEvent } from 'react'
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

type MaterialItem = {
  clientId: string
  id?: number
  sort_order: number
  title: string
  description: string
  icon_path: string
}

type ApiPayload = {
  items?: Array<{
    id?: number
    sort_order: number
    title: string
    description: string
    icon_path: string
  }>
  error?: string
}

export type MaterialStripInitialData = {
  items: Array<{
    id?: number
    sort_order: number
    title: string
    description: string
    icon_path: string
  }>
}

const emptyItem = (sort_order: number): MaterialItem => ({
  clientId: `draft-${Date.now()}-${sort_order}`,
  sort_order,
  title: '',
  description: '',
  icon_path: '',
})

export function MaterialStripEditorClient({ initialData }: { initialData: MaterialStripInitialData }) {
  const { toast } = useToast()
  const [items, setItems] = useState<MaterialItem[]>(
    initialData.items.map((item) => ({ clientId: `id-${item.id ?? item.sort_order}`, ...item }))
  )
  const [loadStatus, setLoadStatus] = useState(initialData.items.length ? 'Material Strip loaded' : 'No material strip rows found yet')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<MaterialItem | null>(null)

  const openEditor = (item?: MaterialItem) => {
    setEditorItem(item ?? emptyItem(items.length + 1))
    setEditorOpen(true)
  }

  const uploadIcon = async (file: File) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/cms/uploads/collection', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as { path?: string; error?: string } | null
    if (!response.ok || !payload?.path) {
      setLoadStatus(payload?.error ?? 'Unable to upload icon.')
      return
    }

    setEditorItem((prev) => (prev ? { ...prev, icon_path: payload.path ?? '' } : prev))
    setLoadStatus('Icon uploaded')
    toast({ title: 'Uploaded', description: 'Material icon uploaded successfully.' })
  }

  const saveEditor = () => {
    if (!editorItem) return
    setItems((prev) => {
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

    const response = await fetch('/api/cms/home/material-strip', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: items.map(({ sort_order, title, description, icon_path }) => ({ sort_order, title, description, icon_path })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Material Strip.')
      return
    }

    setLoadStatus('Material Strip saved')
    toast({ title: 'Saved', description: 'Material Strip updated successfully.' })
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
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Material Strip</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit material title, description, and uploaded icon image</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => openEditor()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus size={16} />
          Add Material
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Title</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Description</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Icon</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.clientId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.title}</td>
                <td className="px-5 py-4 text-sm">{item.description}</td>
                <td className="px-5 py-4 text-sm">{item.icon_path}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button onClick={() => openEditor(item)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => setItems((prev) => prev.filter((x) => x.clientId !== item.clientId))}
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
        title="Save Material Strip?"
        description="This will update the material strip on the homepage."
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
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>Update title, description, and uploaded icon image.</DialogDescription>
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
                  <label className="mb-2 block text-sm font-semibold text-foreground">Icon</label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                      <Plus size={14} />
                      Upload Icon
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0]
                          if (file) void uploadIcon(file)
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">{editorItem.icon_path || 'No icon uploaded yet'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
                <input
                  type="text"
                  value={editorItem.title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={editorItem.description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                  }
                  rows={4}
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
              onClick={saveEditor}
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
