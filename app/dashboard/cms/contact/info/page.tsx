'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type Item = { clientId: string; id?: number; sort_order: number; label: string; value: string; note: string; href: string; icon_path: string }
const empty = (sort_order: number): Item => ({ clientId: `draft-${Date.now()}`, sort_order, label: '', value: '', note: '', href: '', icon_path: '' })

export default function ContactInfoEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<Item>(empty(1))
  const [isSaving, setIsSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return
      const response = await fetch('/api/cms/contact/info', { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => null)
      setItems((payload?.items ?? []).map((item: any) => ({ clientId: `id-${item.id}`, ...item })))
    })()
  }, [])

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order), [items])
  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  const save = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return
    await fetch('/api/cms/contact/info', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ items: sorted.map(({ sort_order, label, value, note, href, icon_path }) => ({ sort_order, label, value, note, href, icon_path })) }) })
    setIsSaving(false)
    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Contact info cards updated successfully.' })
  }

  const uploadIcon = async (file: File) => {
    setUploading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) { setUploading(false); return }
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/cms/uploads/contact', { method: 'POST', headers: { authorization: `Bearer ${accessToken}` }, body: formData })
    const payload = await response.json().catch(() => null)
    if (response.ok && payload?.path) {
      setEditorItem((prev) => ({ ...prev, icon_path: payload.path }))
    }
    setUploading(false)
  }

  return <div className="min-h-screen bg-background p-8"><div className="mb-8 flex items-center justify-between"><Link href="/dashboard/cms/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Back to Contact</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="mb-10"><h1 className="text-3xl font-semibold">Contact Info</h1><p className="text-sm text-muted-foreground">Manage the contact info cards</p></div><div className="overflow-hidden rounded-lg border border-border bg-white"><table className="w-full"><thead><tr className="border-b border-border bg-secondary/40"><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Order</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Label</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Value</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase">Icon</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase">Actions</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.clientId} className="border-b border-border"><td className="px-5 py-4 text-sm">{item.sort_order}</td><td className="px-5 py-4 text-sm">{item.label}</td><td className="px-5 py-4 text-sm">{item.value}</td><td className="px-5 py-4 text-sm">{item.icon_path}</td><td className="px-5 py-4 text-right"><div className="inline-flex gap-2"><button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="rounded-md border px-3 py-2 text-sm"><Edit2 size={14} /></button><button onClick={() => setItems((prev) => prev.filter((x) => x.clientId !== item.clientId))} className="rounded-md border px-3 py-2 text-sm"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div><button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Plus size={16} />Add Card</button><ConfirmDialog isOpen={confirmOpen} title="Save contact info?" description="This updates the contact info cards." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={save} onCancel={() => setConfirmOpen(false)} /><Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent><DialogHeader><DialogTitle>Edit Contact Info</DialogTitle><DialogDescription>Update label, value, note, link, and icon.</DialogDescription></DialogHeader><div className="space-y-4"><input value={editorItem.label} onChange={(e) => setEditorItem((p) => ({ ...p, label: e.target.value }))} placeholder="Label" className="w-full rounded-lg border px-3 py-2" /><input value={editorItem.value} onChange={(e) => setEditorItem((p) => ({ ...p, value: e.target.value }))} placeholder="Value" className="w-full rounded-lg border px-3 py-2" /><input value={editorItem.note} onChange={(e) => setEditorItem((p) => ({ ...p, note: e.target.value }))} placeholder="Note" className="w-full rounded-lg border px-3 py-2" /><input value={editorItem.href} onChange={(e) => setEditorItem((p) => ({ ...p, href: e.target.value }))} placeholder="Href" className="w-full rounded-lg border px-3 py-2" /><div><label className="mb-2 block text-sm font-semibold">Icon</label><div className="flex items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"><Plus size={14} />{uploading ? 'Uploading...' : 'Upload SVG'}<input type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) void uploadIcon(file) }} /></label><span className="text-xs text-muted-foreground">{editorItem.icon_path || 'No icon uploaded yet'}</span></div></div></div><DialogFooter><button onClick={() => setEditorOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button><button onClick={() => { setItems((prev) => { const idx = prev.findIndex((x) => x.clientId === editorItem.clientId); if (idx >= 0) { const copy = [...prev]; copy[idx] = editorItem; return copy } return [...prev, editorItem] }); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm text-white">Update</button></DialogFooter></DialogContent></Dialog></div>
}
