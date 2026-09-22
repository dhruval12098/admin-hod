'use client'

import Link from 'next/link'
import { useState, type ChangeEvent } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { uploadCmsAssetDirectWithFallback } from '@/lib/cms-direct-upload-client'

export type EducationHeroForm = { is_enabled: boolean; heading: string; paragraph: string; button_label: string; button_link: string; desktop_image_path: string; desktop_image_alt: string; mobile_image_path: string; mobile_image_alt: string }

export function EducationHeroEditorClient({ initialData }: { initialData: EducationHeroForm }) {
  const [form, setForm] = useState(initialData)
  const [status, setStatus] = useState('Education hero loaded')
  const [isSaving, setIsSaving] = useState(false)
  const [uploading, setUploading] = useState<'desktop' | 'mobile' | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { toast } = useToast()

  const upload = async (kind: 'desktop' | 'mobile', file?: File) => {
    if (!file) return
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) return setStatus('You are not signed in.')
    setUploading(kind)
    try {
      const path = await uploadCmsAssetDirectWithFallback({ file, accessToken, signEndpoint: '/api/cms/uploads/blog/sign', fallbackEndpoint: '/api/cms/uploads/blog', maxInputBytes: 5 * 1024 * 1024, rasterWidth: 2200, webpQuality: 84 })
      setForm((current) => ({ ...current, [kind === 'desktop' ? 'desktop_image_path' : 'mobile_image_path']: path }))
      setStatus(`${kind === 'desktop' ? 'Desktop' : 'Mobile'} image uploaded`)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to upload image.') } finally { setUploading(null) }
  }

  const save = async () => {
    const { data } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token
    if (!accessToken) return setStatus('You are not signed in.')
    setIsSaving(true)
    const response = await fetch('/api/cms/education/hero', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify(form) })
    const payload = await response.json().catch(() => null) as { error?: string } | null
    setIsSaving(false)
    if (!response.ok) return setStatus(payload?.error ?? 'Unable to save blog hero.')
    setConfirmOpen(false)
    setStatus('Education hero saved')
    toast({ title: 'Saved', description: 'Blog page hero updated successfully.' })
  }

  const input = 'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm'
  return <div className="min-h-screen bg-background p-8">
    <div className="mb-8 flex items-center justify-between gap-4"><Link href="/dashboard/cms/education" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Back to Education</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div>
    <div className="mb-8"><h1 className="font-jakarta text-3xl font-semibold">Education Page Hero</h1><p className="mt-2 text-xs text-muted-foreground">{status}</p></div>
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <section className="space-y-5 rounded-lg border border-border bg-white p-6 shadow-xs">
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} className="h-4 w-4" />Show hero on education page</label>
        <div><label className="mb-2 block text-sm font-semibold">Heading</label><input value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} className={input} /></div>
        <div><label className="mb-2 block text-sm font-semibold">Paragraph</label><textarea rows={5} value={form.paragraph} onChange={(e) => setForm({ ...form, paragraph: e.target.value })} className={input} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold">Button label</label><input value={form.button_label} onChange={(e) => setForm({ ...form, button_label: e.target.value })} className={input} /></div><div><label className="mb-2 block text-sm font-semibold">Button link</label><input value={form.button_link} onChange={(e) => setForm({ ...form, button_link: e.target.value })} className={input} /></div></div>
      </section>
      <section className="space-y-6 rounded-lg border border-border bg-white p-6 shadow-xs">
        {(['desktop','mobile'] as const).map((kind) => <div key={kind} className="space-y-3"><label className="block text-sm font-semibold capitalize">{kind} image</label><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"><Upload size={14} />{uploading === kind ? 'Uploading...' : `Upload ${kind} image`}<input type="file" accept="image/*" className="hidden" disabled={Boolean(uploading)} onChange={(e: ChangeEvent<HTMLInputElement>) => void upload(kind, e.target.files?.[0])} /></label><p className="break-all text-xs text-muted-foreground">{form[`${kind}_image_path`]}</p><label className="block text-sm font-semibold">{kind === 'desktop' ? 'Desktop' : 'Mobile'} image alt text</label><input value={form[`${kind}_image_alt`]} onChange={(e) => setForm({ ...form, [`${kind}_image_alt`]: e.target.value })} className={input} /></div>)}
      </section>
    </div>
    <ConfirmDialog isOpen={confirmOpen} title="Save Blog Hero?" description="This updates the hero shown on the public education page." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={save} onCancel={() => setConfirmOpen(false)} />
  </div>
}
