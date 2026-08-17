'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ExternalLink, Gift, ImageIcon, Monitor, Smartphone, Type, Upload } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { CMSTabs } from '@/components/cms-tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
    cta_action: 'redirect' | 'reveal_coupon'
    selected_coupon_id: number | null
    image_path: string
    mobile_image_path: string
    image_alt: string
    image_only_mode: boolean
    is_active: boolean
    show_once_per_session: boolean
  }
  coupons: Array<{
    id: number
    code: string
    title: string
    usage_limit: number | null
    usage_count: number
  }>
}

type ImageField = 'image_path' | 'mobile_image_path'

function publicAssetUrl(path: string) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_COLLECTION_BUCKET || 'hod'
  return projectUrl ? `${projectUrl}/storage/v1/object/public/${bucket}/${path}` : path
}

export function PromotionEditorClient({ initialData }: { initialData: PromotionInitialData }) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [status, setStatus] = useState('Promotion popup loaded')
  const [uploadingField, setUploadingField] = useState<ImageField | null>(null)
  const [form, setForm] = useState(initialData.item)

  const uploadAsset = async (file: File, field: ImageField) => {
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setStatus('Missing access token.')
      return
    }
    setUploadingField(field)
    setStatus(field === 'mobile_image_path' ? 'Uploading mobile promotion image...' : 'Uploading promotion image...')
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/cms/uploads/promotion-popup', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })
    const payload = await response.json().catch(() => null) as { path?: string; error?: string } | null
    if (!response.ok || !payload?.path) {
      setStatus(payload?.error ?? 'Unable to upload image.')
      setUploadingField(null)
      return
    }
    setForm((prev) => ({ ...prev, [field]: payload.path ?? '' }))
    setUploadingField(null)
    setStatus(field === 'mobile_image_path' ? 'Mobile promotion image uploaded successfully' : 'Promotion image uploaded successfully')
    toast({ title: 'Uploaded', description: field === 'mobile_image_path' ? 'Mobile promotion image uploaded successfully.' : 'Promotion image uploaded successfully.' })
  }


  const fieldClassName = 'w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'

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
      <div className="max-w-4xl space-y-8 rounded-lg border border-border bg-white p-5 shadow-xs sm:p-8">
        <section aria-labelledby="layout-heading">
          <h2 id="layout-heading" className="text-base font-semibold text-foreground">Choose a layout</h2>
          <p className="mt-1 text-sm text-muted-foreground">Select how the promotion will appear to shoppers.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { text: true, title: 'Text + CTA', description: 'A focused, text-only promotion card.', icon: Type },
              { text: false, title: 'Image + Text + CTA', description: 'A split layout with responsive artwork.', icon: ImageIcon },
            ].map((option) => {
              const selected = form.image_only_mode === option.text
              const Icon = option.icon
              return <button key={option.title} type="button" aria-pressed={selected} onClick={() => setForm((prev) => ({ ...prev, image_only_mode: option.text }))} className={`rounded-lg border p-4 text-left outline-none transition focus:ring-2 focus:ring-primary/25 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'}`}>
                <div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-primary/30 bg-white text-primary' : 'border-border bg-secondary/30 text-muted-foreground'}`}><Icon size={17} /></span><span><span className="block text-sm font-semibold text-foreground">{option.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span></span></div>
                <span className="mt-4 flex h-14 items-center justify-center rounded-md border border-border bg-white p-2" aria-hidden="true">{option.text ? <span className="w-2/3 space-y-1.5"><span className="block h-1 w-1/3 bg-muted-foreground/25" /><span className="block h-1.5 w-full bg-foreground/25" /><span className="block h-2 w-1/2 bg-foreground/70" /></span> : <span className="grid h-full w-full grid-cols-2 gap-2"><span className="bg-secondary" /><span className="flex flex-col justify-center gap-1"><span className="h-1 w-1/2 bg-muted-foreground/25" /><span className="h-1.5 w-full bg-foreground/25" /><span className="h-2 w-2/3 bg-foreground/70" /></span></span>}</span>
              </button>
            })}
          </div>
        </section>

        <section aria-labelledby="content-heading" className="border-t border-border pt-7">
          <h2 id="content-heading" className="text-base font-semibold text-foreground">Content</h2>
          <p className="mt-1 text-sm text-muted-foreground">Write the message shoppers will see in the popup.</p>
          <div className="mt-5 space-y-4">
            <div><label htmlFor="promotion-eyebrow" className="mb-2 block text-sm font-semibold text-foreground">Eyebrow text</label><input id="promotion-eyebrow" value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="For a limited time" className={fieldClassName} /><p className="mt-1.5 text-xs text-muted-foreground">A short line displayed above the title.</p></div>
            <div><label htmlFor="promotion-title" className="mb-2 block text-sm font-semibold text-foreground">Title</label><input id="promotion-title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className={fieldClassName} /></div>
            <div><label htmlFor="promotion-description" className="mb-2 block text-sm font-semibold text-foreground">Description</label><textarea id="promotion-description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} className={fieldClassName} /></div>
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="border-t border-border pt-7">
          <h2 id="cta-heading" className="text-base font-semibold text-foreground">Email action</h2>
          <p className="mt-1 text-sm text-muted-foreground">Every promotion shows an email field with its own Submit button first. Choose the CTA shown after a successful submission.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {([
              { value: 'redirect' as const, title: 'Redirect', description: 'Collect the email, then show a CTA linked to a destination.', icon: ExternalLink },
              { value: 'reveal_coupon' as const, title: 'Reveal coupon', description: 'Collect the email, then display a selected coupon.', icon: Gift },
            ]).map((action) => {
              const selected = form.cta_action === action.value
              const Icon = action.icon
              return <button key={action.value} type="button" aria-pressed={selected} onClick={() => setForm((prev) => ({ ...prev, cta_action: action.value }))} className={`flex items-start gap-3 rounded-lg border p-4 text-left outline-none transition focus:ring-2 focus:ring-primary/25 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-primary/30 bg-white text-primary' : 'border-border bg-secondary/30 text-muted-foreground'}`}><Icon size={17} /></span><span><span className="block text-sm font-semibold text-foreground">{action.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span></span></button>
            })}
          </div>
          <div className="mt-5 space-y-4">
            <div><label htmlFor="promotion-cta-text" className="mb-2 block text-sm font-semibold text-foreground">CTA text</label><input id="promotion-cta-text" value={form.cta_text} onChange={(e) => setForm((prev) => ({ ...prev, cta_text: e.target.value }))} placeholder="Shop the collection" className={fieldClassName} /><p className="mt-1.5 text-xs text-muted-foreground">This CTA appears only after the shopper submits their email.</p></div>
            {form.cta_action === 'redirect' ? (
              <div><label htmlFor="promotion-cta-link" className="mb-2 block text-sm font-semibold text-foreground">Destination link</label><input id="promotion-cta-link" value={form.cta_link} onChange={(e) => setForm((prev) => ({ ...prev, cta_link: e.target.value }))} placeholder="/shop" className={fieldClassName} /><p className="mt-1.5 text-xs text-muted-foreground">The shopper is redirected only after their email is saved.</p></div>
            ) : (
              <div><label className="mb-2 block text-sm font-semibold text-foreground">Coupon to reveal</label><Select value={form.selected_coupon_id == null ? undefined : String(form.selected_coupon_id)} onValueChange={(value) => setForm((prev) => ({ ...prev, selected_coupon_id: Number(value) }))}><SelectTrigger className="h-11 w-full bg-white"><SelectValue placeholder="Select an active coupon" /></SelectTrigger><SelectContent>{initialData.coupons.map((coupon) => <SelectItem key={coupon.id} value={String(coupon.id)} disabled={coupon.usage_limit != null && coupon.usage_count >= coupon.usage_limit}>{coupon.code}{coupon.title ? ` — ${coupon.title}` : ''}</SelectItem>)}</SelectContent></Select>{initialData.coupons.length === 0 ? <p className="mt-1.5 text-xs text-destructive">Create and activate a coupon before enabling this action.</p> : <p className="mt-1.5 text-xs text-muted-foreground">The coupon code remains hidden until the email is submitted successfully.</p>}</div>
            )}
          </div>
        </section>

        {!form.image_only_mode ? <section aria-labelledby="media-heading" className="border-t border-border pt-7">
          <h2 id="media-heading" className="text-base font-semibold text-foreground">Media</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use a desktop image and, optionally, a mobile crop. Mobile falls back to desktop when empty.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {([
              { field: 'image_path' as const, title: 'Desktop image', note: 'Recommended 760 × 420', icon: Monitor },
              { field: 'mobile_image_path' as const, title: 'Mobile image', note: 'Optional · Recommended 390 × 360', icon: Smartphone },
            ]).map(({ field, title, note, icon: Icon }) => {
              const value = form[field]
              return <div key={field} className="overflow-hidden rounded-lg border border-border bg-secondary/10">
                <div className="aspect-[16/9] bg-white">{value ? <img src={publicAssetUrl(value)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-muted-foreground"><Icon size={22} /><span className="mt-2 text-xs">No image selected</span></div>}</div>
                <div className="p-4"><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary focus-within:ring-2 focus-within:ring-primary/20"><Upload size={14} />{uploadingField === field ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}<input type="file" accept="image/*,.svg" className="sr-only" disabled={uploadingField !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadAsset(file, field) }} /></label></div>
              </div>
            })}
          </div>
          <div className="mt-4"><label htmlFor="promotion-image-alt" className="mb-2 block text-sm font-semibold text-foreground">Image alt text</label><input id="promotion-image-alt" value={form.image_alt} onChange={(e) => setForm((prev) => ({ ...prev, image_alt: e.target.value }))} placeholder="Describe the promotion artwork" className={fieldClassName} /></div>
        </section> : null}

        <section aria-labelledby="visibility-heading" className="border-t border-border pt-7">
          <h2 id="visibility-heading" className="text-base font-semibold text-foreground">Visibility</h2>
          <div className="mt-4 divide-y divide-border rounded-lg border border-border">
            <label className="flex cursor-pointer items-start justify-between gap-5 p-4"><span><span className="block text-sm font-semibold text-foreground">Active</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Display this promotion on the storefront.</span></span><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} className="mt-1 h-4 w-4 accent-primary" /></label>
            <label className="flex cursor-pointer items-start justify-between gap-5 p-4"><span><span className="block text-sm font-semibold text-foreground">Show once per session</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">After dismissal, do not show it again during the shopper’s current visit.</span></span><input type="checkbox" checked={form.show_once_per_session} onChange={(e) => setForm((prev) => ({ ...prev, show_once_per_session: e.target.checked }))} className="mt-1 h-4 w-4 accent-primary" /></label>
          </div>
        </section>
      </div>
      <ConfirmDialog isOpen={confirmOpen} title="Save promotion popup?" description="This will update the storefront promotional popup." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={() => void save()} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
