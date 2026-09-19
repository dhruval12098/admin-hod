'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Upload } from 'lucide-react'
import { CMSTabs } from '@/components/cms-tabs'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

const stateKeys = ['success', 'pending', 'failed', 'error'] as const
type StateKey = typeof stateKeys[number]
type StateCopy = { state: StateKey; eyebrow: string; heading: string; paragraph: string; order_button_label: string; is_enabled: boolean }
type PageCopy = { main_banner_image_path: string; main_banner_image_url: string; main_banner_image_alt: string; secondary_banner_image_path: string; secondary_banner_image_url: string; secondary_banner_image_alt: string; secondary_eyebrow: string; secondary_heading: string; secondary_paragraph: string; is_enabled: boolean }

const emptyPage: PageCopy = { main_banner_image_path: '', main_banner_image_url: '', main_banner_image_alt: '', secondary_banner_image_path: '', secondary_banner_image_url: '', secondary_banner_image_alt: '', secondary_eyebrow: '', secondary_heading: '', secondary_paragraph: '', is_enabled: true }
const defaults: Record<StateKey, Omit<StateCopy, 'state'>> = {
  success: { eyebrow: 'Order confirmed', heading: 'A beautiful choice, now officially yours.', paragraph: 'Your order has been successfully placed and our team is preparing it with care.', order_button_label: 'View my order', is_enabled: true },
  pending: { eyebrow: 'Payment confirmation pending', heading: 'We are confirming your order.', paragraph: 'Your payment status is still being confirmed. Please check again shortly.', order_button_label: 'View order status', is_enabled: true },
  failed: { eyebrow: 'Payment unsuccessful', heading: 'Your order has not been completed.', paragraph: 'The payment was not completed. You can safely try again.', order_button_label: 'Return to checkout', is_enabled: true },
  error: { eyebrow: 'Confirmation unavailable', heading: 'We could not confirm your order right now.', paragraph: 'Your payment may still be processing. Please check again shortly.', order_button_label: 'Check order status', is_enabled: true },
}
const initialStates = () => stateKeys.map((state) => ({ state, ...defaults[state] }))

async function token() { return (await supabase.auth.getSession()).data.session?.access_token ?? null }

export function CheckoutResultEditor() {
  const { toast } = useToast()
  const mainInput = useRef<HTMLInputElement>(null)
  const secondaryInput = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState<PageCopy>(emptyPage)
  const [states, setStates] = useState<StateCopy[]>(initialStates)
  const [activeState, setActiveState] = useState<StateKey>('success')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'main' | 'secondary' | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [status, setStatus] = useState('Loading checkout result content...')

  useEffect(() => {
    let active = true
    async function load() {
      const access = await token()
      if (!access) { setStatus('You are not signed in.'); setLoading(false); return }
      const response = await fetch('/api/cms/checkout-result', { headers: { authorization: `Bearer ${access}` } })
      const data = await response.json().catch(() => null) as { error?: string; page?: Partial<PageCopy>; states?: StateCopy[] } | null
      if (!active) return
      if (!response.ok) { setStatus(data?.error || 'Unable to load checkout result content.'); setLoading(false); return }
      if (data?.page) setPage({ ...emptyPage, ...data.page })
      const received = data?.states || []
      setStates(stateKeys.map((state) => ({ state, ...defaults[state], ...(received.find((row) => row.state === state) || {}) })))
      setStatus('Checkout result content loaded.'); setLoading(false)
    }
    void load(); return () => { active = false }
  }, [])

  const updateState = (key: keyof Omit<StateCopy, 'state'>, value: string | boolean) => setStates((rows) => rows.map((row) => row.state === activeState ? { ...row, [key]: value } : row))

  async function upload(kind: 'main' | 'secondary', file: File) {
    setUploading(kind); setStatus(`Uploading ${kind} banner...`)
    const access = await token()
    if (!access) { setUploading(null); setStatus('You are not signed in.'); return }
    const form = new FormData(); form.append('file', file)
    const response = await fetch('/api/cms/uploads/checkout-result', { method: 'POST', headers: { authorization: `Bearer ${access}` }, body: form })
    const data = await response.json().catch(() => null) as { path?: string; url?: string; error?: string } | null
    setUploading(null)
    if (!response.ok || !data?.path) { setStatus(data?.error || 'Unable to upload image.'); return }
    setPage((current) => kind === 'main' ? { ...current, main_banner_image_path: data.path!, main_banner_image_url: data.url || '' } : { ...current, secondary_banner_image_path: data.path!, secondary_banner_image_url: data.url || '' })
    setStatus('Image uploaded. Save changes to publish it.')
  }

  async function save() {
    setSaving(true)
    const access = await token()
    if (!access) { setSaving(false); setStatus('You are not signed in.'); return }
    const response = await fetch('/api/cms/checkout-result', { method: 'POST', headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' }, body: JSON.stringify({ page, states }) })
    const data = await response.json().catch(() => null) as { error?: string } | null
    setSaving(false)
    if (!response.ok) { setStatus(data?.error || 'Unable to save checkout result content.'); return }
    setConfirm(false); setStatus('Checkout result content saved.'); toast({ title: 'Saved', description: 'Checkout result page content updated successfully.' })
  }

  const selected = states.find((row) => row.state === activeState)!
  const imagePanel = (kind: 'main' | 'secondary', title: string, help: string) => {
    const url = kind === 'main' ? page.main_banner_image_url : page.secondary_banner_image_url
    const alt = kind === 'main' ? page.main_banner_image_alt : page.secondary_banner_image_alt
    const input = kind === 'main' ? mainInput : secondaryInput
    return <section className="rounded-lg border border-border bg-white p-6 shadow-xs">
      <div className="mb-5"><h2 className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{help}</p></div>
      <div className={`flex w-full items-center justify-center overflow-hidden border border-border bg-secondary/30 ${kind === 'main' ? 'aspect-[16/6] min-h-[300px]' : 'aspect-[16/4] min-h-[210px]'}`}>{url ? <img src={url} alt={alt || `${title} preview`} className="h-full w-full object-cover"/> : <div className="flex flex-col items-center gap-3 text-muted-foreground"><ImagePlus size={28}/><span className="text-sm">Code fallback image will be used</span></div>}</div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(kind, file); event.target.value = '' }}/>
      <button type="button" disabled={uploading !== null} onClick={() => input.current?.click()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"><Upload size={16}/>{uploading === kind ? 'Uploading...' : url ? 'Replace image' : 'Upload image'}</button>
      <label className="mt-5 block text-sm font-semibold">Image alt text<input value={alt} onChange={(event) => setPage((current) => ({ ...current, [kind === 'main' ? 'main_banner_image_alt' : 'secondary_banner_image_alt']: event.target.value }))} className="mt-2 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary" placeholder="Describe this image"/></label>
    </section>
  }

  return <div><CMSTabs/><div className="p-8"><div className="mb-8 flex flex-wrap items-start justify-between gap-5"><div><h1 className="font-jakarta text-3xl font-semibold text-foreground">Checkout Result</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage order result banners and state-specific messaging. Blank media uses the storefront fallback image.</p><p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{status}</p></div><CmsSaveAction onClick={() => setConfirm(true)} isSaving={saving} position="inline"/></div>
    <div className="max-w-6xl space-y-6">
      <section className="rounded-lg border border-border bg-white p-6 shadow-xs"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={page.is_enabled} onChange={(event) => setPage((current) => ({ ...current, is_enabled: event.target.checked }))}/>Enable checkout result CMS content</label></section>
      {imagePanel('main','Main result banner','Wide hero shown at the top of every checkout result state.')}
      <section className="rounded-lg border border-border bg-white p-6 shadow-xs"><div className="border-b border-border"><div className="flex overflow-x-auto">{stateKeys.map((key) => <button key={key} type="button" onClick={() => setActiveState(key)} className={`px-5 py-3 text-sm font-semibold capitalize ${activeState === key ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground'}`}>{key}</button>)}</div></div><div className="mt-6 grid gap-5"><label className="text-sm font-semibold">Eyebrow<input value={selected.eyebrow} onChange={(e)=>updateState('eyebrow',e.target.value)} className="mt-2 h-10 w-full rounded-md border border-border px-3 font-normal"/></label><label className="text-sm font-semibold">Heading<input value={selected.heading} onChange={(e)=>updateState('heading',e.target.value)} className="mt-2 h-10 w-full rounded-md border border-border px-3 font-normal"/></label><label className="text-sm font-semibold">Paragraph<textarea value={selected.paragraph} onChange={(e)=>updateState('paragraph',e.target.value)} rows={4} className="mt-2 w-full rounded-md border border-border p-3 font-normal"/></label><label className="text-sm font-semibold">Button label<input value={selected.order_button_label} onChange={(e)=>updateState('order_button_label',e.target.value)} className="mt-2 h-10 w-full rounded-md border border-border px-3 font-normal"/></label><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={selected.is_enabled} onChange={(e)=>updateState('is_enabled',e.target.checked)}/>Enable {activeState} copy</label></div></section>
      {imagePanel('secondary','Secondary banner','Shorter storytelling banner shown below order details and next steps.')}
      <section className="rounded-lg border border-border bg-white p-6 shadow-xs"><h2 className="text-lg font-semibold">Secondary banner copy</h2><div className="mt-5 grid gap-5"><label className="text-sm font-semibold">Eyebrow<input value={page.secondary_eyebrow} onChange={(e)=>setPage({...page,secondary_eyebrow:e.target.value})} className="mt-2 h-10 w-full rounded-md border border-border px-3 font-normal"/></label><label className="text-sm font-semibold">Heading<input value={page.secondary_heading} onChange={(e)=>setPage({...page,secondary_heading:e.target.value})} className="mt-2 h-10 w-full rounded-md border border-border px-3 font-normal"/></label><label className="text-sm font-semibold">Paragraph<textarea value={page.secondary_paragraph} onChange={(e)=>setPage({...page,secondary_paragraph:e.target.value})} rows={4} className="mt-2 w-full rounded-md border border-border p-3 font-normal"/></label></div></section>
      {loading ? <p className="text-sm text-muted-foreground">Loading editor...</p> : null}
    </div></div><ConfirmDialog isOpen={confirm} title="Publish checkout result content?" description="This updates banners and all state-specific messages on the storefront." confirmText="Publish changes" cancelText="Cancel" onConfirm={() => void save()} onCancel={() => setConfirm(false)} isLoading={saving}/></div>
}
