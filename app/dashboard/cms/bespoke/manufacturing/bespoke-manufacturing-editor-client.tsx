'use client'

import Link from 'next/link'
import { useMemo, useState, type ChangeEvent } from 'react'
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

type ManufacturingItem = {
  clientId: string
  id?: number
  sort_order: number
  step: string
  eyebrow: string
  title: string
  description: string
  media_type: 'image' | 'video'
  media_path: string
  image_path: string
}

type EditorItem = ManufacturingItem

export type BespokeManufacturingInitialData = {
  items: Array<{
    id: number
    sort_order: number
    step: string
    eyebrow: string
    title: string
    description: string
    media_type?: 'image' | 'video' | null
    media_path?: string | null
    image_path: string
  }>
}

type EditorCopy = {
  backHref?: string
  backLabel?: string
  title?: string
  description?: string
  loadedStatus?: string
  emptyStatus?: string
  savedStatus?: string
  confirmTitle?: string
  confirmDescription?: string
}

const empty = (sortOrder: number): EditorItem => ({
  clientId: `draft-${Date.now()}`,
  sort_order: sortOrder,
  step: '',
  eyebrow: '',
  title: '',
  description: '',
  media_type: 'image',
  media_path: '',
  image_path: '',
})

export function BespokeManufacturingEditorClient({
  initialData,
  copy = {},
}: {
  initialData: BespokeManufacturingInitialData
  copy?: EditorCopy
}) {
  const { toast } = useToast()
  const resolvedCopy = {
    backHref: '/dashboard/cms/bespoke',
    backLabel: 'Back to Bespoke',
    title: 'Manufacturing',
    description: 'Manage the workshop cards with images',
    loadedStatus: 'Bespoke manufacturing loaded',
    emptyStatus: 'No workshop cards found yet',
    savedStatus: 'Bespoke manufacturing saved',
    confirmTitle: 'Save Bespoke Manufacturing?',
    confirmDescription: 'This will update the Bespoke manufacturing section on the live site.',
    ...copy,
  }
  const [items, setItems] = useState<ManufacturingItem[]>(
    initialData.items.map((item) => ({
      clientId: `id-${item.id}`,
      ...item,
      media_type: item.media_type === 'video' ? 'video' : 'image',
      media_path: item.media_path ?? item.image_path ?? '',
      image_path: item.image_path ?? item.media_path ?? '',
    }))
  )
  const [status, setStatus] = useState(initialData.items.length ? resolvedCopy.loadedStatus : resolvedCopy.emptyStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<EditorItem>(empty(1))
  const [uploading, setUploading] = useState(false)

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)),
    [items]
  )
  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  const uploadImage = async (file: File) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setStatus('You are not signed in.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/cms/uploads/bespoke-process', {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      const payload = (await response.json().catch(() => null)) as { path?: string; error?: string } | null
      if (!response.ok || !payload?.path) {
        setStatus(payload?.error ?? 'Unable to upload manufacturing image.')
        return
      }
      setEditorItem((prev) => ({ ...prev, media_type: 'image', media_path: payload.path ?? '', image_path: payload.path ?? '' }))
      setStatus('Manufacturing image uploaded')
    } catch {
      setStatus('Unable to upload manufacturing image.')
    } finally {
      setUploading(false)
    }
  }

  const saveAll = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setIsSaving(false)
      setStatus('You are not signed in.')
      return
    }
    const response = await fetch('/api/cms/bespoke/manufacturing', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: sorted.map(({ sort_order, step, eyebrow, title, description, media_type, media_path, image_path }) => ({
          sort_order,
          step,
          eyebrow,
          title,
          description,
          media_type,
          media_path,
          image_path: media_type === 'image' ? (media_path || image_path) : '',
        })),
      }),
    })
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    setIsSaving(false)
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save bespoke manufacturing.')
      return
    }
    setConfirmOpen(false)
    setStatus(resolvedCopy.savedStatus)
    toast({ title: 'Saved', description: resolvedCopy.savedStatus })
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href={resolvedCopy.backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} />
          {resolvedCopy.backLabel}
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-semibold">{resolvedCopy.title}</h1>
        <p className="text-sm text-muted-foreground">{resolvedCopy.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Step</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase">Title</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.clientId} className="border-b">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.step}</td>
                <td className="px-5 py-4 text-sm">{item.title}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="rounded-md border px-3 py-2 text-sm"><Edit2 size={14} /></button>
                    <button onClick={() => { setItems((prev) => prev.filter((x) => x.clientId !== item.clientId)); setStatus('Manufacturing step removed locally. Save changes to publish.') }} className="rounded-md border px-3 py-2 text-sm"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-sm text-muted-foreground">No workshop cards found yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <Plus size={16} />
        Add Step
      </button>

      <ConfirmDialog isOpen={confirmOpen} title={resolvedCopy.confirmTitle} description={resolvedCopy.confirmDescription} confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={saveAll} onCancel={() => setConfirmOpen(false)} />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step</DialogTitle>
            <DialogDescription>Update step number, title, description, and media.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input value={editorItem.step} onChange={(e) => setEditorItem((p) => ({ ...p, step: e.target.value }))} placeholder="Step 01" className="w-full rounded-lg border px-3 py-2" />
              <input value={editorItem.eyebrow} onChange={(e) => setEditorItem((p) => ({ ...p, eyebrow: e.target.value }))} placeholder="Eyebrow" className="w-full rounded-lg border px-3 py-2" />
            </div>
            <input value={editorItem.title} onChange={(e) => setEditorItem((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border px-3 py-2" />
            <textarea value={editorItem.description} onChange={(e) => setEditorItem((p) => ({ ...p, description: e.target.value }))} rows={4} placeholder="Description" className="w-full rounded-lg border px-3 py-2" />
            <div>
              <label className="mb-2 block text-sm font-semibold">Media Type</label>
              <select
                value={editorItem.media_type}
                onChange={(e) => setEditorItem((p) => ({ ...p, media_type: e.target.value as 'image' | 'video', media_path: '', image_path: '' }))}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="image">Image</option>
                <option value="video">Video URL</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">{editorItem.media_type === 'video' ? 'Video URL' : 'Image URL or Upload'}</label>
              <input
                value={editorItem.media_path || editorItem.image_path || ''}
                onChange={(e) => setEditorItem((p) => ({ ...p, media_path: e.target.value, image_path: p.media_type === 'image' ? e.target.value : '' }))}
                placeholder={editorItem.media_type === 'video' ? 'https://cdn.example.com/workshop-video.mp4' : 'https://cdn.example.com/workshop-image.jpg'}
                className="mb-3 w-full rounded-lg border px-3 py-2"
              />
              {editorItem.media_type === 'image' ? (
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold">
                    <Plus size={14} />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                    <input type="file" accept="image/*,.svg" className="hidden" disabled={uploading} onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) void uploadImage(file) }} />
                  </label>
                  <span className="text-xs text-muted-foreground">{editorItem.media_path || editorItem.image_path || 'No image uploaded yet'}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Paste a direct public video URL. Video upload is disabled for this section.</p>
              )}
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
