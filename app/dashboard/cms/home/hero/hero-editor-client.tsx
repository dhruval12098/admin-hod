'use client'

import Link from 'next/link'
import { useMemo, useState, type ChangeEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Edit2, Plus, Trash2, Upload } from 'lucide-react'
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
  section?: HeroSectionData
  items?: Array<{ id: number; sort_order: number; image_path: string; mobile_image_path?: string; button_text: string; button_link: string }>
  error?: string
}

export type HeroEditorInitialData = {
  section: HeroSectionData
  items: Array<{ id: number; sort_order: number; image_path: string; mobile_image_path?: string; button_text: string; button_link: string }>
}

type HeroSectionData = {
  eyebrow: string
  headline: string
  subtitle: string
  slider_enabled: boolean
  seo_title: string
  seo_description: string
}

const emptySlide = (sortOrder: number): SlideItem => ({
  clientId: `draft-${Date.now()}-${sortOrder}`,
  sort_order: sortOrder,
  image_path: '',
  mobile_image_path: '',
  button_text: '',
  button_link: '',
})

export function HeroEditorClient({ initialData }: { initialData: HeroEditorInitialData }) {
  const { toast } = useToast()
  const [formData, setFormData] = useState(initialData.section)
  const [slides, setSlides] = useState<SlideItem[]>(
    initialData.items.map((item) => ({
      clientId: `id-${item.id}`,
      ...item,
      mobile_image_path: item.mobile_image_path ?? '',
    }))
  )
  const [status, setStatus] = useState('Hero content loaded')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<SlideItem>(emptySlide(1))
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)),
    [slides]
  )

  const handleTextChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleToggleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, slider_enabled: e.target.checked }))
  }

  const uploadImage = async (file: File, field: 'image_path' | 'mobile_image_path') => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setStatus('You are not signed in.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadState('error')
      setStatus('File too large. Max size is 5MB.')
      return
    }

    setUploadState('uploading')
    setStatus(field === 'mobile_image_path' ? 'Uploading mobile hero image...' : 'Uploading hero image...')

    let uploadedPath = ''
    try {
      const preparedFile = await prepareHeroImage(file)
      const signResponse = await fetch('/api/cms/uploads/hero/sign', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ contentType: preparedFile.type }),
      })
      const signed = (await signResponse.json().catch(() => null)) as { bucket?: string; path?: string; token?: string; error?: string } | null
      if (!signResponse.ok || !signed?.bucket || !signed.path || !signed.token) throw new Error(signed?.error ?? 'Unable to prepare upload.')

      const { error } = await supabase.storage.from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, preparedFile, { contentType: preparedFile.type })
      if (error) throw error
      uploadedPath = signed.path
    } catch {
      const fallbackFormData = new FormData()
      fallbackFormData.append('file', file)
      const fallbackResponse = await fetch('/api/cms/uploads/hero', {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}` },
        body: fallbackFormData,
      })
      const fallbackPayload = (await fallbackResponse.json().catch(() => null)) as { path?: string; error?: string } | null
      if (!fallbackResponse.ok || !fallbackPayload?.path) {
        setUploadState('error')
        setStatus(fallbackPayload?.error ?? 'Unable to upload hero image.')
        return
      }
      uploadedPath = fallbackPayload.path
    }

    if (!uploadedPath) {
      setUploadState('error')
      setStatus('Unable to upload hero image.')
      return
    }

    setEditorItem((prev) => ({ ...prev, [field]: uploadedPath }))
    setUploadState('done')
    setStatus(field === 'mobile_image_path' ? 'Mobile hero image uploaded successfully' : 'Hero image uploaded successfully')
  }

  const saveEditor = () => {
    setSlides((prev) => {
      const existingIndex = prev.findIndex((item) => item.clientId === editorItem.clientId)
      if (existingIndex >= 0) {
        const copy = [...prev]
        copy[existingIndex] = editorItem
        return resequenceSlides([...copy].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)))
      }

      return resequenceSlides([...prev, editorItem].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)))
    })

    setEditorOpen(false)
    setUploadState('idle')
    setStatus('Hero slide updated')
    toast({
      title: 'Slide updated',
      description: 'Hero slide changes were applied successfully.',
    })
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
        items: sortedSlides.map(({ image_path, mobile_image_path, button_text, button_link }, index) => ({
          sort_order: index + 1,
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

  const resequenceSlides = (items: SlideItem[]) => items.map((item, index) => ({ ...item, sort_order: index + 1 }))

  const moveSlide = (clientId: string, direction: -1 | 1) => {
    setSlides((prev) => {
      const nextSlides = [...prev].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId))
      const currentIndex = nextSlides.findIndex((item) => item.clientId === clientId)
      const targetIndex = currentIndex + direction

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= nextSlides.length) {
        return prev
      }

      ;[nextSlides[currentIndex], nextSlides[targetIndex]] = [nextSlides[targetIndex], nextSlides[currentIndex]]
      return resequenceSlides(nextSlides)
    })
    setStatus('Hero slide order updated. Save changes to publish.')
  }

  const removeSlide = (clientId: string) => {
    setSlides((prev) => resequenceSlides([...prev].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)).filter((item) => item.clientId !== clientId)))
    setStatus('Hero slide removed. Save changes to publish.')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/dashboard/cms/home"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <CmsSaveAction onClick={handleSave} isSaving={isSaving} position="inline" label="Save Changes to Publish" />
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

        <div className="mt-8 max-w-4xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
          <div>
            <h2 className="text-xl font-semibold text-foreground">SEO &amp; Search Preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">Optional homepage search and sharing content. Empty fields use the website defaults.</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-foreground" htmlFor="seo_title">SEO title</label>
              <span className={`text-xs ${formData.seo_title.length > 60 ? 'text-amber-600' : 'text-muted-foreground'}`}>{formData.seo_title.length}/60</span>
            </div>
            <input id="seo_title" type="text" name="seo_title" maxLength={120} value={formData.seo_title} onChange={handleTextChange} placeholder="Luxury Diamond Jewellery" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-foreground" htmlFor="seo_description">Meta description</label>
              <span className={`text-xs ${formData.seo_description.length > 160 ? 'text-amber-600' : 'text-muted-foreground'}`}>{formData.seo_description.length}/160</span>
            </div>
            <textarea id="seo_description" name="seo_description" maxLength={320} value={formData.seo_description} onChange={handleTextChange} rows={3} placeholder="Describe the homepage for search results." className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-5">
            <p className="truncate text-lg text-[#1a0dab]">{formData.seo_title.trim() || 'Luxury Diamond Jewellery'} | House of Diams</p>
            <p className="mt-1 text-sm text-[#16833a]">https://houseofdiams.com/</p>
            <p className="mt-1 text-sm leading-5 text-[#4d5156]">{formData.seo_description.trim() || 'House of Diams creates certified lab-grown diamond jewellery, including engagement rings, wedding bands, T-bar jewellery, and bespoke commissions.'}</p>
          </div>
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
                  {sortedSlides.map((item, index) => (
                    <tr key={item.clientId} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                      <td className="px-5 py-4 text-sm">{item.image_path}</td>
                      <td className="px-5 py-4 text-sm">{item.mobile_image_path || '—'}</td>
                      <td className="px-5 py-4 text-sm">{item.button_text}</td>
                      <td className="px-5 py-4 text-sm">{item.button_link}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => moveSlide(item.clientId, -1)}
                            disabled={index === 0}
                            aria-label="Move slide up"
                            className="inline-flex items-center rounded-md border border-border px-2 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlide(item.clientId, 1)}
                            disabled={index === sortedSlides.length - 1}
                            aria-label="Move slide down"
                            className="inline-flex items-center rounded-md border border-border px-2 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowDown size={14} />
                          </button>
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
                          <button
                            type="button"
                            onClick={() => removeSlide(item.clientId)}
                            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
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
                        if (file) void uploadImage(file, 'image_path')
                      }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">{editorItem.image_path || 'No image uploaded yet'}</span>
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
                        if (file) void uploadImage(file, 'mobile_image_path')
                      }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">{editorItem.mobile_image_path || 'No mobile image uploaded yet'}</span>
                </div>
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

async function prepareHeroImage(file: File) {
  if (file.type === 'image/svg+xml') return file
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('Invalid image type.')
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const width = Math.min(bitmap.width, 2200)
    const height = Math.max(1, Math.round(bitmap.height * (width / bitmap.width)))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84))
    if (!blob) throw new Error('Unable to optimize image.')
    return new File([blob], `${crypto.randomUUID()}.webp`, { type: 'image/webp' })
  } finally {
    bitmap.close()
  }
}
