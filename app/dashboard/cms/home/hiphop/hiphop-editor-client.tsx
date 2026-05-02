'use client'

import Link from 'next/link'
import { useMemo, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Edit2, Plus, Upload } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type HipHopSection = {
  eyebrow: string
  headline: string
  subtitle: string
  slider_enabled: boolean
}

type SlideItem = {
  clientId: string
  id?: number
  sort_order: number
  image_path: string
  mobile_image_path: string
  button_text: string
  button_link: string
}

type ApiPayload = {
  section?: HipHopSection
  items?: Array<{
    id?: number
    sort_order: number
    image_path: string
    mobile_image_path?: string
    button_text: string
    button_link: string
  }>
  path?: string
  error?: string
}

export type HipHopInitialData = {
  section: HipHopSection
  items: Array<{
    id?: number
    sort_order: number
    image_path: string
    mobile_image_path?: string
    button_text: string
    button_link: string
  }>
}

const emptySlide = (sortOrder: number): SlideItem => ({
  clientId: `draft-${Date.now()}-${sortOrder}`,
  sort_order: sortOrder,
  image_path: '',
  mobile_image_path: '',
  button_text: '',
  button_link: '',
})

export function HipHopEditorClient({ initialData }: { initialData: HipHopInitialData }) {
  const { toast } = useToast()
  const [section, setSection] = useState<HipHopSection>(initialData.section)
  const [slides, setSlides] = useState<SlideItem[]>(
    initialData.items.map((item, index) => ({
      clientId: `slide-${item.id ?? index}`,
      ...item,
      mobile_image_path: item.mobile_image_path ?? '',
    }))
  )
  const [loadStatus, setLoadStatus] = useState('Hip Hop page hero loaded')
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<SlideItem>(emptySlide(1))

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)),
    [slides]
  )

  const nextSortOrder = Math.max(...slides.map((item) => item.sort_order), 0) + 1

  const uploadAsset = async (file: File, field: 'image_path' | 'mobile_image_path') => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    setUploadState('uploading')
    setLoadStatus(field === 'mobile_image_path' ? 'Uploading mobile image...' : 'Uploading desktop image...')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/cms/uploads/hiphop-showcase', {
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

    setEditorItem((prev) => ({ ...prev, [field]: payload.path ?? '' }))
    setUploadState('done')
    setLoadStatus(field === 'mobile_image_path' ? 'Mobile image uploaded successfully' : 'Desktop image uploaded successfully')
    toast({
      title: 'Uploaded',
      description: field === 'mobile_image_path' ? 'Mobile hero image uploaded successfully.' : 'Desktop hero image uploaded successfully.',
    })
  }

  const saveEditor = () => {
    setSlides((prev) => {
      const existingIndex = prev.findIndex((item) => item.clientId === editorItem.clientId)
      if (existingIndex >= 0) {
        const copy = [...prev]
        copy[existingIndex] = editorItem
        return copy
      }

      return [...prev, editorItem]
    })

    setEditorOpen(false)
    setUploadState('idle')
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

    const response = await fetch('/api/cms/home/hiphop', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...section,
        items: sortedSlides.map(({ sort_order, image_path, mobile_image_path, button_text, button_link }) => ({
          sort_order,
          image_path,
          mobile_image_path,
          button_text,
          button_link,
        })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Hip Hop page hero.')
      return
    }

    setConfirmOpen(false)
    setLoadStatus('Hip Hop page hero saved')
    toast({ title: 'Saved', description: 'Hip Hop page hero updated successfully.' })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/dashboard/cms/home"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Hip Hop Page Hero</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit text mode or switch to image slider mode for the dedicated Hip Hop page.</p>
          <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
        </div>

        <div className="max-w-4xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
            <input
              type="text"
              value={section.eyebrow}
              onChange={(e) => setSection((prev) => ({ ...prev, eyebrow: e.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Headline</label>
            <input
              type="text"
              value={section.headline}
              onChange={(e) => setSection((prev) => ({ ...prev, headline: e.target.value }))}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label>
            <textarea
              value={section.subtitle}
              onChange={(e) => setSection((prev) => ({ ...prev, subtitle: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Enable image slider</p>
              <p className="text-xs text-muted-foreground">When enabled, the Hip Hop page hero uses slides instead of the text-only layout.</p>
            </div>
            <input
              type="checkbox"
              checked={section.slider_enabled}
              onChange={(e) => setSection((prev) => ({ ...prev, slider_enabled: e.target.checked }))}
              className="h-5 w-5 rounded border-border"
            />
          </label>
        </div>

        {section.slider_enabled && (
          <div className="mt-8 max-w-5xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Page Hero Slides</h2>
                <p className="text-sm text-muted-foreground">Each slide needs an image, button text, and destination link.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditorItem(emptySlide(nextSortOrder))
                  setUploadState('idle')
                  setEditorOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                <Plus size={16} />
                Add Slide
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Desktop Image</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Mobile Image</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Button Text</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Link</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSlides.map((item) => (
                    <tr key={item.clientId} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                      <td className="px-5 py-4 text-sm">{item.image_path}</td>
                      <td className="px-5 py-4 text-sm">{item.mobile_image_path || '-'}</td>
                      <td className="px-5 py-4 text-sm">{item.button_text}</td>
                      <td className="px-5 py-4 text-sm">{item.button_link}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditorItem(item)
                            setUploadState('idle')
                            setEditorOpen(true)
                          }}
                          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sortedSlides.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No slides added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <CmsSaveAction onClick={handleSave} isSaving={isSaving} />

        <ConfirmDialog
          isOpen={confirmOpen}
          title="Save Hip Hop page hero?"
          description="This will update the dedicated Hip Hop page hero on the live site."
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
              <DialogTitle>Edit Hip Hop Slide</DialogTitle>
              <DialogDescription>Upload desktop and mobile images, then set the button label and link.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Order</label>
                <input
                  type="number"
                  value={editorItem.sort_order}
                  onChange={(e) => setEditorItem((prev) => ({ ...prev, sort_order: Number(e.target.value) || 1 }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Desktop Image</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                    <Upload size={14} />
                    {uploadState === 'uploading' ? 'Uploading...' : 'Upload Desktop Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadState === 'uploading'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadAsset(file, 'image_path')
                      }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">{editorItem.image_path || 'No desktop image uploaded yet'}</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Mobile Image</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                    <Upload size={14} />
                    {uploadState === 'uploading' ? 'Uploading...' : 'Upload Mobile Image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadState === 'uploading'}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadAsset(file, 'mobile_image_path')
                      }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">{editorItem.mobile_image_path || 'No mobile image uploaded yet'}</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Button Text</label>
                <input
                  type="text"
                  value={editorItem.button_text}
                  onChange={(e) => setEditorItem((prev) => ({ ...prev, button_text: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Button Link</label>
                <input
                  type="text"
                  value={editorItem.button_link}
                  onChange={(e) => setEditorItem((prev) => ({ ...prev, button_link: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              {editorOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setSlides((prev) => prev.filter((item) => item.clientId !== editorItem.clientId))
                    setEditorOpen(false)
                    setUploadState('idle')
                  }}
                  className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove Slide
                </button>
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditor}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Update Slide
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
