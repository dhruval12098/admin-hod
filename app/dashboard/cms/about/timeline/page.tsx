'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type Item = { clientId: string; id?: number; sort_order: number; year: string; label: string }
type Payload = { items?: Array<{ id: number; sort_order: number; year: string; label: string }>; error?: string }
const empty = (sort_order: number): Item => ({ clientId: `draft-${Date.now()}`, sort_order, year: '', label: '' })

export default function TimelineEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState('Loading timeline...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<Item>(empty(1))

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)), [items])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return setStatus('You are not signed in.')
      const response = await fetch('/api/cms/about/timeline', { headers: { authorization: `Bearer ${token}` } })
      const payload = (await response.json().catch(() => null)) as Payload | null
      if (!response.ok) return setStatus(payload?.error ?? 'Unable to load timeline.')
      setItems((payload?.items ?? []).map((item) => ({ clientId: `id-${item.id}`, ...item })))
      setStatus(payload?.items?.length ? 'Timeline loaded' : 'No timeline items yet')
    }
    load()
  }, [])

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
    const response = await fetch('/api/cms/about/timeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: sorted.map(({ sort_order, year, label }) => ({ sort_order, year, label })) }),
    })
    const payload = await response.json().catch(() => null)
    setIsSaving(false)
    if (!response.ok) return setStatus(payload?.error ?? 'Unable to save timeline.')
    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Timeline updated successfully.' })
    setStatus('Timeline saved')
  }

  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  return <div className="min-h-screen bg-background p-8"><div className="mb-8 flex items-center justify-between gap-4"><Link href="/dashboard/cms/about" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><ArrowLeft size={16} />Back to About</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="mb-10"><h1 className="font-jakarta text-3xl font-semibold text-foreground">Timeline</h1><p className="mt-1 text-sm text-muted-foreground">Edit company history milestones</p><p className="mt-2 text-xs text-muted-foreground">{status}</p></div><div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs"><table className="w-full"><thead><tr className="border-b border-border bg-secondary/40"><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Year</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Label</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.clientId} className="border-b border-border last:border-b-0"><td className="px-5 py-4 text-sm">{item.sort_order}</td><td className="px-5 py-4 text-sm">{item.year}</td><td className="px-5 py-4 text-sm">{item.label}</td><td className="px-5 py-4 text-right"><button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"><Edit2 size={14}/>Edit</button></td></tr>)}</tbody></table></div><button onClick={() => { setEditorItem(empty(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><Plus size={16}/>Add Milestone</button><ConfirmDialog isOpen={confirmOpen} title="Save timeline?" description="This will update the about timeline on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={saveAll} onCancel={() => setConfirmOpen(false)} /><Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Edit Milestone</DialogTitle><DialogDescription>Update the year and milestone label.</DialogDescription></DialogHeader><div className="space-y-4"><div><label className="mb-2 block text-sm font-semibold text-foreground">Year</label><input value={editorItem.year} onChange={(e) => setEditorItem(prev => ({ ...prev, year: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Label</label><input value={editorItem.label} onChange={(e) => setEditorItem(prev => ({ ...prev, label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div></div><DialogFooter><button onClick={() => setEditorOpen(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button><button onClick={() => { saveEditor(); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">Update Item</button></DialogFooter></DialogContent></Dialog></div>
}
