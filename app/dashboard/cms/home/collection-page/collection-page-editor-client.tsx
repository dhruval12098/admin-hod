'use client'

import Link from 'next/link'
import { useState, type ChangeEvent } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export type CollectionPageEditorInitialData = {
  page_enabled: boolean
  show_in_footer: boolean
  show_home_showcase: boolean
  showcase_heading: string
  showcase_subtitle: string
  showcase_cta_label: string
  showcase_cta_href: string
  showcase_image_path: string
  showcase_mobile_image_path: string
}

type ApiPayload = { item?: CollectionPageEditorInitialData; path?: string; error?: string }

export function CollectionPageEditorClient({ initialData }: { initialData: CollectionPageEditorInitialData }) {
  const { toast } = useToast()
  const [form, setForm] = useState(initialData)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('Collection page settings loaded')

  const uploadAsset = async (file: File, field: 'showcase_image_path' | 'showcase_mobile_image_path') => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return

    if (file.size > 5 * 1024 * 1024) {
      setStatus('File too large. Max size is 5MB.')
      return
    }

    let uploadedPath = ''
    try {
      const preparedFile = await prepareCollectionImage(file)
      const signResponse = await fetch('/api/cms/uploads/collection-page/sign', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ contentType: preparedFile.type }),
      })
      const signed = (await signResponse.json().catch(() => null)) as { bucket?: string; path?: string; token?: string; error?: string } | null
      if (!signResponse.ok || !signed?.bucket || !signed.path || !signed.token) {
        throw new Error(signed?.error ?? 'Unable to prepare upload.')
      }

      const { error } = await supabase.storage.from(signed.bucket)
        .uploadToSignedUrl(signed.path, signed.token, preparedFile, { contentType: preparedFile.type })
      if (error) throw error
      uploadedPath = signed.path
    } catch {
      const fallbackBody = new FormData()
      fallbackBody.append('file', file)
      const fallbackResponse = await fetch('/api/cms/uploads/collection-page', {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}` },
        body: fallbackBody,
      })
      const fallbackPayload = (await fallbackResponse.json().catch(() => null)) as ApiPayload | null
      if (!fallbackResponse.ok || !fallbackPayload?.path) {
        setStatus(fallbackPayload?.error ?? 'Upload failed')
        return
      }
      uploadedPath = fallbackPayload.path
    }

    setForm((prev) => ({ ...prev, [field]: uploadedPath }))
    setStatus(field === 'showcase_mobile_image_path' ? 'Mobile showcase image uploaded' : 'Showcase image uploaded')
    toast({ title: 'Uploaded', description: 'Collection showcase image uploaded successfully.' })
  }

  const confirmSave = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setIsSaving(false)
      return
    }

    const response = await fetch('/api/cms/home/collection-page', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(form),
    })
    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save collection page settings.')
      return
    }
    setConfirmOpen(false)
    setStatus('Collection page settings saved')
    toast({ title: 'Saved', description: 'Collection page settings updated successfully.' })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard/cms" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to CMS
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Collection Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Control where the Collection page appears on the website and edit the homepage Collection banner.</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="max-w-4xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
        <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Show Collection Page on Website</p>
            <p className="text-xs text-muted-foreground">Turn this on to make the public /collection page available. Turn it off to hide the page.</p>
          </div>
          <input type="checkbox" checked={form.page_enabled} onChange={(e) => setForm((prev) => ({ ...prev, page_enabled: e.target.checked }))} className="h-5 w-5 rounded border-border" />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Show Collection Link in Footer</p>
            <p className="text-xs text-muted-foreground">Turn this on to add Collection in the website footer navigation.</p>
          </div>
          <input type="checkbox" checked={form.show_in_footer} onChange={(e) => setForm((prev) => ({ ...prev, show_in_footer: e.target.checked }))} className="h-5 w-5 rounded border-border" />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Show Collection Banner on Home Page</p>
            <p className="text-xs text-muted-foreground">Turn this on to show the wide Collection banner after Best Sellers on the home page.</p>
          </div>
          <input type="checkbox" checked={form.show_home_showcase} onChange={(e) => setForm((prev) => ({ ...prev, show_home_showcase: e.target.checked }))} className="h-5 w-5 rounded border-border" />
        </label>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Home Page Banner Heading</label>
          <input value={form.showcase_heading} onChange={(e) => setForm((prev) => ({ ...prev, showcase_heading: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Home Page Banner Subtitle</label>
          <textarea value={form.showcase_subtitle} onChange={(e) => setForm((prev) => ({ ...prev, showcase_subtitle: e.target.value }))} rows={4} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Button Text</label>
            <input value={form.showcase_cta_label} onChange={(e) => setForm((prev) => ({ ...prev, showcase_cta_label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Button Link</label>
            <input value={form.showcase_cta_href} onChange={(e) => setForm((prev) => ({ ...prev, showcase_cta_href: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Home Page Banner Desktop Image</label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              <Upload size={14} />
              Upload Image
              <input type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0]
                if (file) void uploadAsset(file, 'showcase_image_path')
              }} />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">{form.showcase_image_path || 'No desktop image uploaded yet'}</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Home Page Banner Mobile Image</label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              <Upload size={14} />
              Upload Mobile Image
              <input type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0]
                if (file) void uploadAsset(file, 'showcase_mobile_image_path')
              }} />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">{form.showcase_mobile_image_path || 'No mobile image uploaded yet'}</p>
          </div>
        </div>
      </div>

      <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save collection page settings?"
        description="This will update the public Collection page, footer visibility, and home showcase."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={confirmSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

async function prepareCollectionImage(file: File) {
  if (file.type === 'image/svg+xml') return file
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('Invalid image type.')
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const width = Math.min(bitmap.width, 1600)
    const height = Math.max(1, Math.round(bitmap.height * (width / bitmap.width)))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
    if (!blob) throw new Error('Unable to optimize image.')
    return new File([blob], `${crypto.randomUUID()}.webp`, { type: 'image/webp' })
  } finally {
    bitmap.close()
  }
}
