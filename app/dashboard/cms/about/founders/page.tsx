'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Edit2, Plus, Trash2, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type Item = { clientId: string; id?: number; sort_order: number; name: string; designation: string; bio: string; image_path: string }
type Payload = { items?: Array<{ id: number; sort_order: number; name: string; designation: string; bio: string; image_path: string }>; error?: string }
const empty = (sort_order: number): Item => ({ clientId: `draft-${Date.now()}`, sort_order, name: '', designation: '', bio: '', image_path: '' })

export default function FoundersEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState('Loading founders...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<Item>(empty(1))
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)), [items])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return setStatus('You are not signed in.')
      const response = await fetch('/api/cms/about/founders', { headers: { authorization: `Bearer ${token}` } })
      const payload = (await response.json().catch(() => null)) as Payload | null
      if (!response.ok) return setStatus(payload?.error ?? 'Unable to load founders.')
      setItems((payload?.items ?? []).map((item) => ({ clientId: `id-${item.id}`, ...item })))
      setStatus(payload?.items?.length ? 'Founders loaded' : 'No founders yet')
    }
    load()
  }, [])

  const uploadImage = async (file: File) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return setStatus('You are not signed in.')
    setUploadState('uploading')
    setStatus('Uploading image...')
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/cms/uploads/founders', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: formData,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.path) { setUploadState('error'); return setStatus(payload?.error ?? 'Unable to upload image.') }
    setEditorItem((prev) => ({ ...prev, image_path: payload.path }))
    setUploadState('done')
    setStatus('Image uploaded successfully')
  }

  const saveEditor = () => setItems((prev) => {
    const idx = prev.findIndex((i) => i.clientId === editorItem.clientId)
    const next = { ...editorItem, sort_order: Number.isFinite(editorItem.sort_order) ? editorItem.sort_order : 1 }
    if (idx >= 0) { const copy = [...prev]; copy[idx] = { ...copy[idx], ...next }; return copy }
    return [...prev, next]
  })

  const saveAll = async () => {
    setIsSaving(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) { setIsSaving(false); return setStatus('You are not signed in.') }
    const response = await fetch('/api/cms/about/founders', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: sorted.map(({ sort_order, name, designation, bio, image_path }) => ({ sort_order, name, designation, bio, image_path })) }),
    })
    const payload = await response.json().catch(() => null)
    setIsSaving(false)
    if (!response.ok) return setStatus(payload?.error ?? 'Unable to save founders.')
    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Founders updated successfully.' })
    setStatus('Founders saved')
  }

  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  return <div className="min-h-screen bg-background p-8"><div className="mb-8 flex items-center justify-between gap-4"><Link href="/dashboard/cms/about" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><ArrowLeft size={16} />Back to About</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="mb-10"><h1 className="font-jakarta text-3xl font-semibold text-foreground">Founders</h1><p className="mt-1 text-sm text-muted-foreground">Manage founder profiles</p><p className="mt-2 text-xs text-muted-foreground">{status}</p></div><div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs"><table className="w-full"><thead><tr className="border-b border-border bg-secondary/40"><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Name</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Designation</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Image</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.clientId} className="border-b border-border last:border-b-0"><td className="px-5 py-4 text-sm">{item.sort_order}</td><td className="px-5 py-4 text-sm">{item.name}</td><td className="px-5 py-4 text-sm">{item.designation}</td><td className="px-5 py-4 text-sm">{item.image_path}</td><td className="px-5 py-4 text-right"><button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"><Edit2 size={14}/>Edit</button></td></tr>)}</tbody></table></div><button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><Plus size={16}/>Add Founder</button><ConfirmDialog isOpen={confirmOpen} title="Save founders?" description="This will update the founders section on the homepage." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={saveAll} onCancel={() => setConfirmOpen(false)} /><Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Edit Founder</DialogTitle><DialogDescription>Update the founder card and upload an image.</DialogDescription></DialogHeader><div className="space-y-4"><div><label className="mb-2 block text-sm font-semibold text-foreground">Name</label><input value={editorItem.name} onChange={(e) => setEditorItem(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Designation</label><input value={editorItem.designation} onChange={(e) => setEditorItem(prev => ({ ...prev, designation: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Bio</label><textarea value={editorItem.bio} onChange={(e) => setEditorItem(prev => ({ ...prev, bio: e.target.value }))} rows={5} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Image</label><div className="flex items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"><Upload size={14} />{uploadState === 'uploading' ? 'Uploading...' : 'Upload Image'}<input type="file" accept="image/*" className="hidden" disabled={uploadState === 'uploading'} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file) }} /></label><span className="text-xs text-muted-foreground">{editorItem.image_path || 'No image uploaded yet'}</span></div></div></div><DialogFooter><button onClick={() => setEditorOpen(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button><button onClick={() => { saveEditor(); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">Update Item</button></DialogFooter></DialogContent></Dialog></div>
}
