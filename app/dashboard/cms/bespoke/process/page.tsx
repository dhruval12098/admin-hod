'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type Item = { clientId: string; id?: number; sort_order: number; eyebrow: string; title: string; description: string }
const empty = (sort_order: number): Item => ({ clientId: `draft-${Date.now()}`, sort_order, eyebrow: '', title: '', description: '' })

export default function BespokeProcessEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [editorItem, setEditorItem] = useState<Item>(empty(1))
  const [editorOpen, setEditorOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return
      const response = await fetch('/api/cms/bespoke/process', { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => null)
      setItems((payload?.items ?? []).map((item: any) => ({ clientId: `id-${item.id}`, ...item })))
    })()
  }, [])

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order), [items])
  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  const saveAll = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) { setIsSaving(false); return }
    const response = await fetch('/api/cms/bespoke/process', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ items: sorted.map(({ sort_order, eyebrow, title, description }) => ({ sort_order, eyebrow, title, description })) }),
    })
    setIsSaving(false)
    setConfirmOpen(false)
    if (response.ok) toast({ title: 'Saved', description: 'Bespoke process steps updated successfully.' })
  }

  return <div className="min-h-screen bg-background p-8"><div className="mb-8 flex items-center justify-between"><Link href="/dashboard/cms/bespoke" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Back to Bespoke</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="mb-10"><h1 className="text-3xl font-semibold">Process Steps</h1><p className="text-sm text-muted-foreground">Manage the Bespoke process cards section</p></div><div className="overflow-hidden rounded-lg border bg-white"><table className="w-full"><thead><tr className="border-b bg-secondary/40"><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Order</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Eyebrow</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Title</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase">Actions</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.clientId} className="border-b"><td className="px-5 py-4 text-sm">{item.sort_order}</td><td className="px-5 py-4 text-sm">{item.eyebrow}</td><td className="px-5 py-4 text-sm">{item.title}</td><td className="px-5 py-4 text-right"><div className="inline-flex gap-2"><button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="rounded-md border px-3 py-2 text-sm"><Edit2 size={14} /></button><button onClick={() => setItems((prev) => prev.filter((x) => x.clientId !== item.clientId))} className="rounded-md border px-3 py-2 text-sm"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div><button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Plus size={16} />Add Step</button><ConfirmDialog isOpen={confirmOpen} title="Save Bespoke Process?" description="This will update the Bespoke process cards on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={saveAll} onCancel={() => setConfirmOpen(false)} /><Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent><DialogHeader><DialogTitle>Edit Step</DialogTitle><DialogDescription>Update eyebrow, title, and description.</DialogDescription></DialogHeader><div className="space-y-4"><div><label className="mb-2 block text-sm font-semibold">Eyebrow</label><input value={editorItem.eyebrow} onChange={(e) => setEditorItem((p) => ({ ...p, eyebrow: e.target.value }))} className="w-full rounded-lg border px-3 py-2" /></div><div><label className="mb-2 block text-sm font-semibold">Title</label><input value={editorItem.title} onChange={(e) => setEditorItem((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border px-3 py-2" /></div><div><label className="mb-2 block text-sm font-semibold">Description</label><textarea value={editorItem.description} onChange={(e) => setEditorItem((p) => ({ ...p, description: e.target.value }))} rows={4} className="w-full rounded-lg border px-3 py-2" /></div></div><DialogFooter><button onClick={() => setEditorOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button><button onClick={() => { setItems((prev) => { const idx = prev.findIndex((x) => x.clientId === editorItem.clientId); if (idx >= 0) { const copy = [...prev]; copy[idx] = editorItem; return copy } return [...prev, editorItem] }); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm text-white">Update</button></DialogFooter></DialogContent></Dialog></div>
}
