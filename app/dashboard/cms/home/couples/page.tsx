'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Edit2, Plus, Trash2, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type Item = { clientId: string; id?: number; sort_order: number; names: string; location: string; story: string; product_name: string; product_detail: string; image_path: string }
type Payload = { section?: { section_key: string; eyebrow: string; heading: string; subtitle: string }; items?: Array<{ id: number; sort_order: number; names: string; location: string; story: string; product_name: string; product_detail: string; image_path: string }>; error?: string }
const empty = (sort_order: number): Item => ({ clientId: `draft-${Date.now()}`, sort_order, names: '', location: '', story: '', product_name: '', product_detail: '', image_path: '' })

export default function CouplesEditor() {
  const { toast } = useToast()
  const [eyebrow, setEyebrow] = useState('Love Stories')
  const [heading, setHeading] = useState('Our Cute Couples')
  const [subtitle, setSubtitle] = useState('Real couples. Real proposals. Real diamonds. Every ring tells a story.')
  const [items, setItems] = useState<Item[]>([])
  const [loadStatus, setLoadStatus] = useState('Loading couples...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<Item>(empty(1))
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)), [items])

  useEffect(() => { (async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return setLoadStatus('You are not signed in.')
    const res = await fetch('/api/cms/home/couples', { headers: { authorization: `Bearer ${token}` } })
    const payload = (await res.json().catch(() => null)) as Payload | null
    if (!res.ok) return setLoadStatus(payload?.error ?? 'Unable to load couples.')
    if (payload?.section) { setEyebrow(payload.section.eyebrow); setHeading(payload.section.heading); setSubtitle(payload.section.subtitle) }
    setItems((payload?.items ?? []).map((item) => ({ clientId: `id-${item.id}`, ...item })))
    setLoadStatus(payload?.items?.length ? 'Couples loaded' : 'No couples found yet')
  })() }, [])

  const saveEditor = () => setItems(prev => {
    const idx = prev.findIndex(i => i.clientId === editorItem.clientId)
    const next = { ...editorItem, sort_order: Number.isFinite(editorItem.sort_order) ? editorItem.sort_order : 1 }
    if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...next }; return copy }
    return [...prev, next]
  })

  const uploadImage = async (file: File) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return setLoadStatus('You are not signed in.')

    setUploadState('uploading')
    setLoadStatus('Uploading image...')

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/cms/uploads/couples', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: formData,
    })

    const payload = (await res.json().catch(() => null)) as { path?: string; error?: string } | null
    if (!res.ok || !payload?.path) {
      setUploadState('error')
      return setLoadStatus(payload?.error ?? 'Unable to upload image.')
    }

    setEditorItem(prev => ({ ...prev, image_path: payload.path ?? '' }))
    setUploadState('done')
    setLoadStatus('Image uploaded successfully')
  }

  const saveAll = async () => {
    setIsSaving(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) { setIsSaving(false); return setLoadStatus('You are not signed in.') }
    const res = await fetch('/api/cms/home/couples', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ section: { eyebrow, heading, subtitle }, items: sorted.map(({ sort_order, names, location, story, product_name, product_detail, image_path }) => ({ sort_order, names, location, story, product_name, product_detail, image_path })) }) })
    const payload = (await res.json().catch(() => null)) as Payload | null
    setIsSaving(false)
    if (!res.ok) return setLoadStatus(payload?.error ?? 'Unable to save couples.')
    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Couples updated successfully.' })
    setLoadStatus('Couples saved')
  }

  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  return <div className="p-8"><div className="mb-8 flex items-center justify-between gap-4"><Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><ArrowLeft size={16} />Back to Home</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="mb-10"><h1 className="font-jakarta text-3xl font-semibold text-foreground">Couples</h1><p className="mt-1 text-sm text-muted-foreground">Manage the couples section cards and modal content</p><p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p></div><div className="mb-6 max-w-4xl space-y-4"><div><label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label><input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Heading</label><input value={heading} onChange={(e) => setHeading(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label><textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div></div><div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs"><table className="w-full"><thead><tr className="border-b border-border bg-secondary/40"><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Names</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Image</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.clientId} className="border-b border-border last:border-b-0"><td className="px-5 py-4 text-sm">{item.sort_order}</td><td className="px-5 py-4 text-sm">{item.names}</td><td className="px-5 py-4 text-sm">{item.image_path}</td><td className="px-5 py-4 text-right"><button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"><Edit2 size={14}/>Edit</button></td></tr>)}</tbody></table></div><button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><Plus size={16}/>Add Couple</button><ConfirmDialog isOpen={confirmOpen} title="Save couples?" description="This will update the couples section on the homepage." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={saveAll} onCancel={() => setConfirmOpen(false)} /><Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Edit Couple</DialogTitle><DialogDescription>Update the card fields and upload an image.</DialogDescription></DialogHeader><div className="space-y-4"><div><label className="mb-2 block text-sm font-semibold text-foreground">Names</label><input value={editorItem.names} onChange={(e) => setEditorItem(prev => ({ ...prev, names: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Location</label><input value={editorItem.location} onChange={(e) => setEditorItem(prev => ({ ...prev, location: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Story</label><textarea value={editorItem.story} onChange={(e) => setEditorItem(prev => ({ ...prev, story: e.target.value }))} rows={4} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Product Name</label><input value={editorItem.product_name} onChange={(e) => setEditorItem(prev => ({ ...prev, product_name: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Product Detail</label><input value={editorItem.product_detail} onChange={(e) => setEditorItem(prev => ({ ...prev, product_detail: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Image</label><div className="flex items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"><Upload size={14} />{uploadState === 'uploading' ? 'Uploading...' : 'Upload Image'}<input type="file" accept="image/*" className="hidden" disabled={uploadState === 'uploading'} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file) }} /></label><span className="text-xs text-muted-foreground">{editorItem.image_path || 'No image uploaded yet'}</span></div><p className="mt-2 text-xs text-muted-foreground">{uploadState === 'uploading' ? 'Uploading and validating image...' : uploadState === 'done' ? 'Upload complete. You can now save the item.' : uploadState === 'error' ? 'Upload failed. Please try another image.' : 'Choose a JPG, PNG, WebP, or AVIF image up to 5MB.'}</p></div></div><DialogFooter><button onClick={() => setEditorOpen(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button><button onClick={() => { saveEditor(); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">Update Item</button></DialogFooter></DialogContent></Dialog></div>
}
