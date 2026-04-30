'use client'

import Link from 'next/link'
import { useState, type ChangeEvent } from 'react'
import { ArrowLeft, Edit2, Plus, Upload, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type DiscoverItem = {
  clientId: string
  sort_order: number
  title: string
  description: string
  image_path: string
  image_alt: string
  shape_id?: string
  target_kind?: string
  target_id?: string
}

type PersistedDiscoverItem = Omit<DiscoverItem, 'clientId'>

type ApiPayload = {
  items?: PersistedDiscoverItem[]
  path?: string
  url?: string
  error?: string
}

export type DiscoverItemsInitialData = {
  items: PersistedDiscoverItem[]
}

type ShapeOption = {
  id: string
  name: string
  slug: string
}

type LinkTargetOption = {
  id: string
  name: string
}

type LinkTargetGroup = {
  kind: string
  label: string
  options: LinkTargetOption[]
}

type DiscoverItemsEditorClientProps = {
  backHref: string
  sectionName: string
  sectionDescription: string
  saveEndpoint: string
  uploadEndpoint: string
  saveDescription: string
  initialData: DiscoverItemsInitialData
  shapeOptions?: ShapeOption[]
  shapeFieldLabel?: string
  linkTargetGroups?: LinkTargetGroup[]
  linkTargetKindLabel?: string
  linkTargetItemLabel?: string
}

const emptyItem = (sortOrder: number): DiscoverItem => ({
  clientId: `draft-${Date.now()}-${sortOrder}`,
  sort_order: sortOrder,
  title: '',
  description: '',
  image_path: '',
  image_alt: '',
  shape_id: '',
  target_kind: '',
  target_id: '',
})

export function DiscoverItemsEditorClient({
  backHref,
  sectionName,
  sectionDescription,
  saveEndpoint,
  uploadEndpoint,
  saveDescription,
  initialData,
  shapeOptions = [],
  shapeFieldLabel = 'Linked Shape',
  linkTargetGroups = [],
  linkTargetKindLabel = 'Target Type',
  linkTargetItemLabel = 'Target Item',
}: DiscoverItemsEditorClientProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<DiscoverItem[]>(
    initialData.items.map((item, index) => ({
      ...item,
      shape_id: item.shape_id ?? '',
      target_kind: item.target_kind ?? '',
      target_id: item.target_id ?? '',
      clientId: `item-${index + 1}-${item.sort_order}`,
    }))
  )
  const [loadStatus, setLoadStatus] = useState(initialData.items.length ? `${sectionName} loaded` : `No ${sectionName.toLowerCase()} items found yet`)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<DiscoverItem | null>(null)
  const activeLinkTargetOptions =
    editorItem && linkTargetGroups.length > 0
      ? linkTargetGroups.find((group) => group.kind === (editorItem.target_kind ?? ''))?.options ?? []
      : []

  const openEditor = (item?: DiscoverItem) => {
    setUploadState('idle')
    setEditorItem(item ?? emptyItem(items.length + 1))
    setEditorOpen(true)
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

    const response = await fetch(uploadEndpoint, {
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
      description: `${sectionName} image uploaded successfully.`,
    })
  }

  const saveEditor = () => {
    if (!editorItem) return
    const normalizedItem = {
      ...editorItem,
      image_alt: editorItem.title.trim() || editorItem.image_alt,
    }
    setItems((prev) => {
      const exists = prev.some((item) => item.clientId === normalizedItem.clientId)
      return exists
        ? prev.map((item) => (item.clientId === normalizedItem.clientId ? normalizedItem : item))
        : [...prev, normalizedItem]
    })
    setEditorOpen(false)
  }

  const confirmSave = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setIsSaving(false)
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch(saveEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: items.map(({ clientId: _clientId, ...item }) => ({
          ...item,
          image_alt: item.title.trim() || item.image_alt,
        })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? `Unable to save ${sectionName}.`)
      return
    }

    setConfirmOpen(false)
    setLoadStatus(`${sectionName} saved`)
    toast({ title: 'Saved', description: `${sectionName} updated successfully.` })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">{sectionName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{sectionDescription}</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => openEditor()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Title</th>
              {shapeOptions.length > 0 ? (
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">{shapeFieldLabel}</th>
              ) : null}
              {linkTargetGroups.length > 0 ? (
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">{linkTargetItemLabel}</th>
              ) : null}
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Description</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Image Path</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items
              .slice()
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((item) => (
                <tr key={item.clientId} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                  <td className="px-5 py-4 text-sm">{item.title}</td>
                  {shapeOptions.length > 0 ? (
                    <td className="px-5 py-4 text-sm">
                      {shapeOptions.find((shape) => shape.id === item.shape_id)?.name || 'Not linked'}
                    </td>
                  ) : null}
                  {linkTargetGroups.length > 0 ? (
                    <td className="px-5 py-4 text-sm">
                      {(() => {
                        const group = linkTargetGroups.find((entry) => entry.kind === item.target_kind)
                        const option = group?.options.find((entry) => entry.id === item.target_id)
                        return option ? `${group?.label}: ${option.name}` : 'Not linked'
                      })()}
                    </td>
                  ) : null}
                  <td className="px-5 py-4 text-sm">{item.description}</td>
                  <td className="px-5 py-4 text-sm">{item.image_path}</td>
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
                        onClick={() => setItems((prev) => prev.filter((entry) => entry.clientId !== item.clientId))}
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

      <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} />

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Save ${sectionName}?`}
        description={saveDescription}
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
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item title, description, and uploaded image.</DialogDescription>
          </DialogHeader>

          {editorItem ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Order</label>
                  <input
                    type="number"
                    value={editorItem.sort_order}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setEditorItem((prev) => (prev ? { ...prev, sort_order: Number(event.target.value) } : prev))
                    }
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
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          const file = event.target.files?.[0]
                          if (file) void uploadImage(file)
                          event.target.value = ''
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">{editorItem.image_path || 'No image uploaded yet'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
                <input
                  type="text"
                  value={editorItem.title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setEditorItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            title: event.target.value,
                            image_alt: event.target.value,
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={editorItem.description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                  }
                  rows={4}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              {shapeOptions.length > 0 ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">{shapeFieldLabel}</label>
                  <Select
                    value={editorItem.shape_id || '__none__'}
                    onValueChange={(value) =>
                      setEditorItem((prev) => (prev ? { ...prev, shape_id: value === '__none__' ? '' : value } : prev))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a shape" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No linked shape</SelectItem>
                      {shapeOptions.map((shape) => (
                        <SelectItem key={shape.id} value={shape.id}>
                          {shape.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {linkTargetGroups.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">{linkTargetKindLabel}</label>
                    <Select
                      value={editorItem.target_kind || '__none__'}
                      onValueChange={(value) =>
                        setEditorItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                target_kind: value === '__none__' ? '' : value,
                                target_id: '',
                              }
                            : prev
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select target type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No linked target type</SelectItem>
                        {linkTargetGroups.map((group) => (
                          <SelectItem key={group.kind} value={group.kind}>
                            {group.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">{linkTargetItemLabel}</label>
                    <Select
                      value={editorItem.target_id || '__none__'}
                      onValueChange={(value) =>
                        setEditorItem((prev) => (prev ? { ...prev, target_id: value === '__none__' ? '' : value } : prev))
                      }
                      disabled={!editorItem.target_kind}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={editorItem.target_kind ? 'Select target item' : 'Pick target type first'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          {editorItem.target_kind ? 'No linked target item' : 'Pick target type first'}
                        </SelectItem>
                        {activeLinkTargetOptions.map((option) => (
                          <SelectItem key={`${editorItem.target_kind}-${option.id}`} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

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
