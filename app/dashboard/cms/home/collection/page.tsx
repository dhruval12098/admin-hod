'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Edit2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type CollectionItem = {
  sort_order: number
  label: string
  title: string
  description: string
  image_path: string
  link: string
}

type ApiPayload = {
  items?: CollectionItem[]
  path?: string
  url?: string
  error?: string
}

export default function CollectionEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<CollectionItem[]>([])
  const [loadStatus, setLoadStatus] = useState('Loading Collection...')
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<CollectionItem | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setLoadStatus('You are not signed in.')
        return
      }

      const response = await fetch('/api/cms/home/collection', {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const payload = (await response.json().catch(() => null)) as ApiPayload | null
      if (!response.ok) {
        setLoadStatus(payload?.error ?? 'Unable to load Collection.')
        return
      }

      setItems(payload?.items ?? [])
      setLoadStatus(payload?.items?.length ? 'Collection loaded' : 'No collection items found yet')
    }

    load()
  }, [])

  const handleOpenEditor = (item?: CollectionItem) => {
    setEditorItem(
      item ?? {
        sort_order: items.length + 1,
        label: '',
        title: '',
        description: '',
        image_path: '',
        link: '',
      }
    )
    setEditorOpen(true)
  }

  const saveEditor = () => {
    if (!editorItem) return
    setItems((prev) => {
      const exists = prev.some((item) => item.sort_order === editorItem.sort_order)
      if (exists) {
        return prev.map((item) => (item.sort_order === editorItem.sort_order ? editorItem : item))
      }
      return [...prev, editorItem]
    })
    setEditorOpen(false)
  }

  const uploadImage = async (file: File) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    setUploadState('uploading')
    setLoadStatus('Uploading image...')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/cms/uploads/collection', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    if (!response.ok || !payload?.path) {
      setUploadState('error')
      setLoadStatus(payload?.error ?? 'Unable to upload image.')
      return
    }

    setEditorItem((prev) => (prev ? { ...prev, image_path: payload.path ?? '' } : prev))
    setUploadState('done')
    setLoadStatus('Image uploaded successfully')
    toast({
      title: 'Uploaded',
      description: 'Collection image uploaded successfully.',
    })
  }

  const handleSave = () => setConfirmOpen(true)

  const confirmSave = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setIsSaving(false)
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/collection', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ items }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Collection.')
      return
    }

    setConfirmOpen(false)
    setLoadStatus('Collection saved')
    toast({ title: 'Saved', description: 'Collection updated successfully.' })
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
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Collection</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit collection cards, images, and links</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => handleOpenEditor()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Edit2 size={16} />
          Add Collection
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Label</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Title</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Image</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Link</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.sort_order} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.label}</td>
                <td className="px-5 py-4 text-sm">{item.title}</td>
                <td className="px-5 py-4 text-sm">{item.image_path}</td>
                <td className="px-5 py-4 text-sm">{item.link}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => handleOpenEditor(item)}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CmsSaveAction onClick={handleSave} isSaving={isSaving} />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save Collection?"
        description="This will update the collection cards on the homepage."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={confirmSave}
        onCancel={() => setConfirmOpen(false)}
      />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>Update label, title, description, image, and link.</DialogDescription>
          </DialogHeader>

          {editorItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Order</label>
                  <input
                    type="number"
                    value={editorItem.sort_order}
                    onChange={(e) =>
                      setEditorItem((prev) => (prev ? { ...prev, sort_order: Number(e.target.value) } : prev))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Label</label>
                  <input
                    type="text"
                    value={editorItem.label}
                    onChange={(e) =>
                      setEditorItem((prev) => (prev ? { ...prev, label: e.target.value } : prev))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
                <input
                  type="text"
                  value={editorItem.title}
                  onChange={(e) =>
                    setEditorItem((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={editorItem.description}
                  onChange={(e) =>
                    setEditorItem((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                  }
                  rows={4}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Image</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                    <Upload size={14} />
                    {uploadState === 'uploading' ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadState === 'uploading'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadImage(file)
                      }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">{editorItem.image_path || 'No image uploaded yet'}</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-md border border-border bg-secondary/30">
                  <div
                    className={`h-1.5 transition-all ${
                      uploadState === 'uploading'
                        ? 'w-2/3 animate-pulse bg-primary'
                        : uploadState === 'done'
                          ? 'w-full bg-emerald-500'
                          : uploadState === 'error'
                            ? 'w-full bg-red-500'
                            : 'w-0 bg-primary'
                    }`}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {uploadState === 'uploading'
                    ? 'Uploading and validating image...'
                    : uploadState === 'done'
                      ? 'Upload complete. You can now save the item.'
                      : uploadState === 'error'
                        ? 'Upload failed. Please try another image.'
                        : 'Choose a JPG, PNG, WebP, or AVIF image up to 5MB.'}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Link</label>
                <input
                  type="text"
                  value={editorItem.link}
                  onChange={(e) =>
                    setEditorItem((prev) => (prev ? { ...prev, link: e.target.value } : prev))
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
