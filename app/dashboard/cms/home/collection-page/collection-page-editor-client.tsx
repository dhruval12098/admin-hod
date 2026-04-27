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

    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/cms/uploads/collection', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body,
    })
    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    if (!response.ok || !payload?.path) {
      setStatus(payload?.error ?? 'Upload failed')
      return
    }
    setForm((prev) => ({ ...prev, [field]: payload.path ?? '' }))
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
        <Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Collection Page</h1>
        <p className="mt-1 text-sm text-muted-foreground">Control Collection page publishing, footer visibility, and homepage showcase.</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="max-w-4xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
        <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Enable Collection Page</p>
            <p className="text-xs text-muted-foreground">When disabled, the public collection route will not be available.</p>
          </div>
          <input type="checkbox" checked={form.page_enabled} onChange={(e) => setForm((prev) => ({ ...prev, page_enabled: e.target.checked }))} className="h-5 w-5 rounded border-border" />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Show in Footer</p>
            <p className="text-xs text-muted-foreground">Adds the Collection link to the footer navigation when the page is enabled.</p>
          </div>
          <input type="checkbox" checked={form.show_in_footer} onChange={(e) => setForm((prev) => ({ ...prev, show_in_footer: e.target.checked }))} className="h-5 w-5 rounded border-border" />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Show Home Showcase</p>
            <p className="text-xs text-muted-foreground">Displays the dedicated Collection showcase section on the homepage.</p>
          </div>
          <input type="checkbox" checked={form.show_home_showcase} onChange={(e) => setForm((prev) => ({ ...prev, show_home_showcase: e.target.checked }))} className="h-5 w-5 rounded border-border" />
        </label>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Showcase Heading</label>
          <input value={form.showcase_heading} onChange={(e) => setForm((prev) => ({ ...prev, showcase_heading: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Showcase Subtitle</label>
          <textarea value={form.showcase_subtitle} onChange={(e) => setForm((prev) => ({ ...prev, showcase_subtitle: e.target.value }))} rows={4} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">CTA Label</label>
            <input value={form.showcase_cta_label} onChange={(e) => setForm((prev) => ({ ...prev, showcase_cta_label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">CTA Href</label>
            <input value={form.showcase_cta_href} onChange={(e) => setForm((prev) => ({ ...prev, showcase_cta_href: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Desktop Showcase Image</label>
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
            <label className="mb-2 block text-sm font-semibold text-foreground">Mobile Showcase Image</label>
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
