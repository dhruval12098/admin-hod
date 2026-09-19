'use client'

import Link from 'next/link'
import { ChangeEvent, useState } from 'react'
import { ArrowLeft, ImageIcon, Upload, Video } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Switch } from '@/components/ui/switch'
import { CmsSaveAction } from '@/components/cms-save-action'
import { uploadCmsAssetDirectWithFallback } from '@/lib/cms-direct-upload-client'
import { supabase } from '@/lib/supabase'

export type OverlayPosition = 'left' | 'center' | 'right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
export type AboutHeroInitialData = {
  section_key: string; is_enabled: boolean; media_type: 'image' | 'video'; desktop_media_path: string;
  mobile_media_path: string; video_poster_path: string; media_alt: string; show_text_overlay: boolean;
  heading: string; paragraph: string; show_button: boolean; button_label: string; button_link: string;
  overlay_position: OverlayPosition; overlay_scrim_enabled: boolean;
}

const inputClass = 'w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10'
const positions: Array<{ value: OverlayPosition; label: string }> = [
  { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' },
  { value: 'bottom-left', label: 'Bottom left' }, { value: 'bottom-center', label: 'Bottom center' }, { value: 'bottom-right', label: 'Bottom right' },
]

function SwitchRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between gap-6 rounded-lg border border-border px-4 py-3">
    <span><span className="block text-sm font-semibold text-foreground">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
  </div>
}

export function AboutHeroEditorClient({ initialData }: { initialData: AboutHeroInitialData }) {
  const [form, setForm] = useState(initialData)
  const [status, setStatus] = useState('About hero loaded')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const patch = <K extends keyof AboutHeroInitialData>(key: K, value: AboutHeroInitialData[K]) => setForm((current) => ({ ...current, [key]: value }))

  const upload = async (event: ChangeEvent<HTMLInputElement>, target: 'desktop_media_path' | 'mobile_media_path' | 'video_poster_path') => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return setStatus('You are not signed in.')
    const kind = target === 'video_poster_path' ? 'poster' : form.media_type
    setUploading(target)
    setStatus(`Uploading ${target === 'desktop_media_path' ? 'desktop media' : target === 'mobile_media_path' ? 'mobile media' : 'video poster'}...`)
    try {
      const isVideo = kind === 'video'
      const path = await uploadCmsAssetDirectWithFallback({
        file, accessToken: token, signEndpoint: '/api/cms/uploads/about-hero/sign', fallbackEndpoint: '/api/cms/uploads/about-hero',
        maxInputBytes: isVideo ? 100 * 1024 * 1024 : 8 * 1024 * 1024,
        allowedMimeTypes: isVideo ? ['video/mp4', 'video/webm', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        ...(isVideo ? {} : { rasterWidth: 2400, webpQuality: 86, rasterOnly: true }),
        signFields: { kind, declaredSize: file.size }, fallbackFields: { kind },
      })
      const nextForm = { ...form, [target]: path }
      setForm(nextForm)
      const saveResponse = await fetch('/api/cms/about/hero', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(nextForm),
      })
      const savePayload = await saveResponse.json().catch(() => null) as { error?: string } | null
      if (!saveResponse.ok) throw new Error(savePayload?.error ?? 'Image uploaded, but the hero record could not be updated.')
      setStatus('Hero media uploaded and saved.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Upload failed.') }
    finally { setUploading(null) }
  }

  const save = async () => {
    setSaving(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) { setSaving(false); return setStatus('You are not signed in.') }
    const response = await fetch('/api/cms/about/hero', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    const payload = await response.json().catch(() => null) as { error?: string } | null
    setSaving(false)
    if (!response.ok) return setStatus(payload?.error ?? 'Unable to save about hero.')
    setConfirmOpen(false); setStatus('About hero saved')
  }

  const mediaAccept = form.media_type === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/avif'
  const uploadBox = (label: string, target: 'desktop_media_path' | 'mobile_media_path' | 'video_poster_path', accept = mediaAccept) => <div>
    <label className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
    <label className="flex min-h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 p-5 text-center transition hover:border-primary hover:bg-secondary/50">
      <span className="text-sm text-muted-foreground"><Upload className="mx-auto mb-2 size-5" />{uploading === target ? 'Uploading...' : form[target] ? 'Replace media' : 'Choose file'}</span>
      <input type="file" accept={accept} className="sr-only" disabled={Boolean(uploading)} onChange={(event) => upload(event, target)} />
    </label>
    {form[target] ? <div className="mt-2 flex gap-2"><input value={form[target]} readOnly className={`${inputClass} min-w-0 text-xs`} /><button type="button" className="rounded-md border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-secondary" onClick={() => patch(target, '')}>Clear</button></div> : null}
  </div>

  return <div className="min-h-screen bg-background p-8">
    <div className="mb-8 flex items-center justify-between gap-4"><Link href="/dashboard/cms/about" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"><ArrowLeft size={16} />Back to About</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={saving} position="inline" /></div>
    <div className="mb-10"><h1 className="font-jakarta text-3xl font-semibold text-foreground">About Hero</h1><p className="mt-1 text-sm text-muted-foreground">Manage the full-width image or video banner at the top of the About page.</p><p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{status}</p></div>

    <div className="grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-white p-8 shadow-xs"><h2 className="font-jakarta text-lg font-semibold">Media</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(['image', 'video'] as const).map((type) => <button key={type} type="button" onClick={() => patch('media_type', type)} className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition ${form.media_type === type ? 'border-primary bg-primary text-white' : 'border-border bg-white'}`}>{type === 'image' ? <ImageIcon size={16} /> : <Video size={16} />}{type === 'image' ? 'Image' : 'Video'}</button>)}
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">{uploadBox('Desktop media', 'desktop_media_path')}{uploadBox('Mobile media (optional)', 'mobile_media_path')}</div>
          {form.media_type === 'video' ? <div className="mt-5">{uploadBox('Video poster (optional)', 'video_poster_path', 'image/jpeg,image/png,image/webp,image/avif')}</div> : null}
          <div className="mt-5"><label className="mb-2 block text-sm font-semibold">Media alt text</label><input value={form.media_alt} onChange={(e) => patch('media_alt', e.target.value)} className={inputClass} placeholder="Describe the banner image" /></div>
        </section>

        <section className="rounded-lg border border-border bg-white p-8 shadow-xs"><h2 className="font-jakarta text-lg font-semibold">Overlay content</h2>
          <div className="mt-5 space-y-5"><div><label className="mb-2 block text-sm font-semibold">Heading</label><input value={form.heading} onChange={(e) => patch('heading', e.target.value)} className={inputClass} /></div>
          <div><label className="mb-2 block text-sm font-semibold">Paragraph</label><textarea value={form.paragraph} onChange={(e) => patch('paragraph', e.target.value)} rows={5} className={inputClass} /></div>
          <div><label className="mb-2 block text-sm font-semibold">Position</label><select value={form.overlay_position} onChange={(e) => patch('overlay_position', e.target.value as OverlayPosition)} className={inputClass}>{positions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          {form.show_button ? <div className="grid gap-5 md:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold">Button label</label><input value={form.button_label} onChange={(e) => patch('button_label', e.target.value)} className={inputClass} /></div><div><label className="mb-2 block text-sm font-semibold">Button link</label><input value={form.button_link} onChange={(e) => patch('button_link', e.target.value)} className={inputClass} placeholder="/contact" /></div></div> : null}</div>
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-border bg-white p-6 shadow-xs"><h2 className="font-jakarta text-lg font-semibold">Display</h2><div className="mt-4 space-y-3">
        <SwitchRow label="Enable hero" description="Show the hero on the About page." checked={form.is_enabled} onChange={(value) => patch('is_enabled', value)} />
        <SwitchRow label="Show text overlay" description="Display heading and paragraph over the media." checked={form.show_text_overlay} onChange={(value) => patch('show_text_overlay', value)} />
        <SwitchRow label="Show button" description="Display the CTA when label and link are present." checked={form.show_button} onChange={(value) => patch('show_button', value)} />
      </div></aside>
    </div>
    <ConfirmDialog isOpen={confirmOpen} title="Save About Hero?" description="This will update the About page hero on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={saving} onConfirm={save} onCancel={() => setConfirmOpen(false)} />
  </div>
}




