'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Edit2, Plus, Upload } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type SlideItem = {
  clientId: string
  id?: number
  sort_order: number
  image_path: string
  mobile_image_path: string
  mobile_image_alt?: string
  button_text: string
  button_link: string
}

type Payload = {
  section?: { eyebrow: string; headline: string; subtitle: string; slider_enabled: boolean }
  items?: Array<{ id: number; sort_order: number; image_path: string; mobile_image_path?: string; button_text: string; button_link: string }>
  error?: string
}

const emptySlide = (sortOrder: number): SlideItem => ({
  clientId: `draft-${Date.now()}-${sortOrder}`,
  sort_order: sortOrder,
  image_path: '',
  mobile_image_path: '',
  button_text: '',
  button_link: '',
})

export default function HeroEditor() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({ eyebrow: '', headline: '', subtitle: '', slider_enabled: false })
  const [slides, setSlides] = useState<SlideItem[]>([])
  const [status, setStatus] = useState('Loading hero content...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<SlideItem>(emptySlide(1))
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)),
    [slides]
  )

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setStatus('You are not signed in.')
        return
      }

      const response = await fetch('/api/cms/home/hero', {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const payload = (await response.json().catch(() => null)) as Payload | null
      if (!response.ok) {
        setStatus(payload?.error ?? 'Unable to load hero content.')
        return
      }

      if (payload?.section) setFormData(payload.section)
      setSlides((payload?.items ?? []).map((item) => ({ clientId: `id-${item.id}`, ...item, mobile_image_path: item.mobile_image_path ?? '' })))
      setStatus('Hero content loaded')
    }

    load()
  }, [])

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, slider_enabled: e.target.checked }))
  }

  const uploadImage = async (file: File) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setStatus('You are not signed in.')
      return
    }

    setUploadState('uploading')
    setStatus('Uploading hero image...')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/cms/uploads/hero', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as { path?: string; error?: string } | null
    if (!response.ok || !payload?.path) {
      setUploadState('error')
      setStatus(payload?.error ?? 'Unable to upload hero image.')
      return
    }

    setEditorItem((prev) => ({ ...prev, image_path: payload.path ?? '' }))
    setUploadState('done')
    setStatus('Hero image uploaded successfully')
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

  const handleConfirmSave = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setStatus('You are not signed in.')
      return
    }

    setIsSaving(true)
    const response = await fetch('/api/cms/home/hero', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...formData,
        items: sortedSlides.map(({ sort_order, image_path, mobile_image_path, button_text, button_link }) => ({
          sort_order,
          image_path,
          mobile_image_path,
          button_text,
          button_link,
        })),
      }),
    })

    setIsSaving(false)
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      setStatus(payload?.error ?? 'Unable to save hero content.')
      return
    }

    setStatus('Hero content saved')
    setConfirmOpen(false)
    toast({
      title: 'Saved',
      description: 'Hero content was updated successfully.',
    })
  }

  const nextSortOrder = Math.max(...slides.map((item) => item.sort_order), 0) + 1

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
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Hero Section</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit hero text or switch to the image slider.</p>
          <p className="mt-2 text-xs text-muted-foreground">{status}</p>
        </div>

        <div className="max-w-4xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
            <input
              type="text"
              name="eyebrow"
              value={formData.eyebrow}
              onChange={handleTextChange}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Headline</label>
            <input
              type="text"
              name="headline"
              value={formData.headline}
              onChange={handleTextChange}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label>
            <textarea
              name="subtitle"
              value={formData.subtitle}
              onChange={handleTextChange}
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Enable image slider</p>
              <p className="text-xs text-muted-foreground">When enabled, the hero text layout is replaced by slides.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.slider_enabled}
              onChange={handleToggleChange}
              className="h-5 w-5 rounded border-border"
            />
          </label>
        </div>

        {formData.slider_enabled && (
          <div className="mt-8 max-w-5xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Hero Slides</h2>
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
                      <td className="px-5 py-4 text-sm">{item.mobile_image_path || '—'}</td>
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
          title="Save hero changes?"
          description="This will update the homepage hero on the live site."
          confirmText="Save"
          cancelText="Cancel"
          type="confirm"
          isLoading={isSaving}
          onConfirm={handleConfirmSave}
          onCancel={() => setConfirmOpen(false)}
        />

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Hero Slide</DialogTitle>
              <DialogDescription>Upload a desktop image, add an optional mobile image, and define the button label and link.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Order</label>
                <input
                  type="number"
                  value={editorItem.sort_order}
                  onChange={(e) => setEditorItem((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Desktop Image</label>
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Mobile Image Path</label>
                <input
                  type="text"
                  value={editorItem.mobile_image_path}
                  onChange={(e) => setEditorItem((prev) => ({ ...prev, mobile_image_path: e.target.value }))}
                  placeholder="Optional smaller-screen image path"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  If empty, mobile will use the same desktop hero image.
                </p>
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
