'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { CMSTabs } from '@/components/cms-tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export type PromotionInitialData = {
  item: {
    label: string
    title: string
    description: string
    cta_text: string
    cta_link: string
    image_path: string
    image_alt: string
    image_only_mode: boolean
    is_active: boolean
    show_once_per_session: boolean
  }
}

export function PromotionEditorClient({ initialData }: { initialData: PromotionInitialData }) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [status, setStatus] = useState('Promotion popup loaded')
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [form, setForm] = useState(initialData.item)

  const uploadAsset = async (file: File) => {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setStatus('Missing access token.')
      return
    }
    setUploadState('uploading')
    setStatus('Uploading promotion image...')
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/cms/uploads/promotion-popup', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })
    const payload = await response.json().catch(() => null) as { path?: string; error?: string } | null
    if (!response.ok || !payload?.path) {
      setUploadState('error')
      setStatus(payload?.error ?? 'Unable to upload image.')
      return
    }
    setForm((prev) => ({ ...prev, image_path: payload.path ?? '' }))
    setUploadState('done')
    setStatus('Promotion image uploaded successfully')
    toast({ title: 'Uploaded', description: 'Promotion image uploaded successfully.' })
  }

  const save = async () => {
    setIsSaving(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Missing access token.')
      const response = await fetch('/api/cms/promotion', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(payload?.error ?? 'Unable to save promotion popup.')
      setConfirmOpen(false)
      setStatus('Promotion popup saved')
      toast({ title: 'Saved', description: 'Promotion popup updated successfully.' })
    } catch (error) {
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Unable to save promotion popup.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-8">
      <CMSTabs />
      <div className="mb-8 mt-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><ArrowLeft size={16} />Back to CMS</Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Promotion Popup</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the first-visit promotional modal shown on the storefront.</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>
      <div className="max-w-4xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
        <div className="rounded-lg border border-border bg-secondary/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Popup Mode</p>
              <p className="mt-1 text-xs text-muted-foreground">Choose whether the popup should show text content or a fixed banner image, while keeping the CTA at the bottom.</p>
            </div>
            <div className="inline-flex rounded-full border border-border bg-white p-1">
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, image_only_mode: false }))} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${!form.image_only_mode ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-secondary'}`}>Text + CTA</button>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, image_only_mode: true }))} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${form.image_only_mode ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-secondary'}`}>Image + CTA</button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-2 block text-sm font-semibold text-foreground">Label</label><input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div>
          <div><label className="mb-2 block text-sm font-semibold text-foreground">CTA Text</label><input value={form.cta_text} onChange={(e) => setForm((prev) => ({ ...prev, cta_text: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div>
        </div>
        {!form.image_only_mode ? (
          <>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Title</label><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Description</label><textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={5} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">CTA Link</label><input value={form.cta_link} onChange={(e) => setForm((prev) => ({ ...prev, cta_link: e.target.value }))} placeholder="/shop" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div>
          </>
        ) : null}
        <div><label className="mb-2 block text-sm font-semibold text-foreground">CTA Link</label><input value={form.cta_link} onChange={(e) => setForm((prev) => ({ ...prev, cta_link: e.target.value }))} placeholder="/shop" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div>
        <div className="rounded-lg border border-border bg-secondary/10 p-4">
          <label className="mb-2 block text-sm font-semibold text-foreground">Promotion Image</label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-white px-4 py-6 text-center hover:border-primary">
            <Upload size={18} className="text-muted-foreground" />
            <span className="mt-2 text-sm font-medium text-foreground">{uploadState === 'uploading' ? 'Uploading...' : 'Upload image'}</span>
            <span className="mt-1 text-xs text-muted-foreground">Saved into promotion popup media folder</span>
            <input type="file" accept="image/*,.svg" className="hidden" disabled={uploadState === 'uploading'} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAsset(file) }} />
            <span className="mt-3 text-xs text-muted-foreground">{form.image_path || 'No image uploaded yet'}</span>
          </label>
        </div>
        <div><label className="mb-2 block text-sm font-semibold text-foreground">Image Alt Text</label><input value={form.image_alt} onChange={(e) => setForm((prev) => ({ ...prev, image_alt: e.target.value }))} placeholder="Promotion image alt text" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div>
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />Active</label>
          <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground"><input type="checkbox" checked={form.show_once_per_session} onChange={(e) => setForm((prev) => ({ ...prev, show_once_per_session: e.target.checked }))} />Show once per session</label>
        </div>
      </div>
      <ConfirmDialog isOpen={confirmOpen} title="Save promotion popup?" description="This will update the storefront promotional popup." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={() => void save()} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
