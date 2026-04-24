'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type Item = { clientId: string; id?: number; sort_order: number; step: string; eyebrow: string; title: string; description: string; image_path: string }
const empty = (sort_order: number): Item => ({ clientId: `draft-${Date.now()}`, sort_order, step: '', eyebrow: '', title: '', description: '', image_path: '' })

export default function BespokeManufacturingEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [editorItem, setEditorItem] = useState<Item>(empty(1))
  const [editorOpen, setEditorOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return
      const response = await fetch('/api/cms/bespoke/manufacturing', { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => null)
      setItems((payload?.items ?? []).map((item: any) => ({ clientId: `id-${item.id}`, ...item })))
    })()
  }, [])

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order), [items])
  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  const uploadImage = async (file: File) => {
    setUploading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) { setUploading(false); return }
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/cms/uploads/bespoke-process', { method: 'POST', headers: { authorization: `Bearer ${accessToken}` }, body: formData })
    const payload = await response.json().catch(() => null)
    if (response.ok && payload?.path) setEditorItem((prev) => ({ ...prev, image_path: payload.path }))
    setUploading(false)
  }

  const saveAll = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) { setIsSaving(false); return }
    const response = await fetch('/api/cms/bespoke/manufacturing', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ items: sorted.map(({ sort_order, step, eyebrow, title, description, image_path }) => ({ sort_order, step, eyebrow, title, description, image_path })) }),
    })
    setIsSaving(false)
    setConfirmOpen(false)
    if (response.ok) toast({ title: 'Saved', description: 'Bespoke manufacturing updated successfully.' })
  }

  return <div className="min-h-screen bg-background p-8"><div className="mb-8 flex items-center justify-between"><Link href="/dashboard/cms/bespoke" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Back to Bespoke</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="mb-10"><h1 className="text-3xl font-semibold">Manufacturing</h1><p className="text-sm text-muted-foreground">Manage the workshop cards with images</p></div><div className="overflow-hidden rounded-lg border bg-white"><table className="w-full"><thead><tr className="border-b bg-secondary/40"><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Order</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Step</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Title</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase">Actions</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.clientId} className="border-b"><td className="px-5 py-4 text-sm">{item.sort_order}</td><td className="px-5 py-4 text-sm">{item.step}</td><td className="px-5 py-4 text-sm">{item.title}</td><td className="px-5 py-4 text-right"><div className="inline-flex gap-2"><button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="rounded-md border px-3 py-2 text-sm"><Edit2 size={14} /></button><button onClick={() => setItems((prev) => prev.filter((x) => x.clientId !== item.clientId))} className="rounded-md border px-3 py-2 text-sm"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div><button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Plus size={16} />Add Step</button><ConfirmDialog isOpen={confirmOpen} title="Save Bespoke Manufacturing?" description="This will update the Bespoke manufacturing section on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={saveAll} onCancel={() => setConfirmOpen(false)} /><Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent><DialogHeader><DialogTitle>Edit Step</DialogTitle><DialogDescription>Update step number, title, description, and image.</DialogDescription></DialogHeader><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><input value={editorItem.step} onChange={(e) => setEditorItem((p) => ({ ...p, step: e.target.value }))} placeholder="Step 01" className="w-full rounded-lg border px-3 py-2" /><input value={editorItem.eyebrow} onChange={(e) => setEditorItem((p) => ({ ...p, eyebrow: e.target.value }))} placeholder="Eyebrow" className="w-full rounded-lg border px-3 py-2" /></div><input value={editorItem.title} onChange={(e) => setEditorItem((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border px-3 py-2" /><textarea value={editorItem.description} onChange={(e) => setEditorItem((p) => ({ ...p, description: e.target.value }))} rows={4} placeholder="Description" className="w-full rounded-lg border px-3 py-2" /><div><label className="mb-2 block text-sm font-semibold">Image</label><div className="flex items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"><Plus size={14} />{uploading ? 'Uploading...' : 'Upload Image'}<input type="file" accept="image/*,.svg" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) void uploadImage(file) }} /></label><span className="text-xs text-muted-foreground">{editorItem.image_path || 'No image uploaded yet'}</span></div></div></div><DialogFooter><button onClick={() => setEditorOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button><button onClick={() => { setItems((prev) => { const idx = prev.findIndex((x) => x.clientId === editorItem.clientId); if (idx >= 0) { const copy = [...prev]; copy[idx] = editorItem; return copy } return [...prev, editorItem] }); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm text-white">Update</button></DialogFooter></DialogContent></Dialog></div>
}
