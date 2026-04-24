'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type AnnouncementItem = {
  clientId: string
  id?: number
  sort_order: number
  message: string
  link_url: string
  open_in_new_tab: boolean
  is_active: boolean
}

type ApiPayload = {
  section?: { section_key: string; is_active: boolean; autoplay: boolean; speed_ms: number }
  items?: Array<{ id: number; sort_order: number; message: string; link_url: string; open_in_new_tab: boolean; is_active: boolean }>
  error?: string
}

type EditorItem = {
  clientId: string
  sort_order: number
  message: string
  link_url: string
  open_in_new_tab: boolean
  is_active: boolean
}

const emptyEditorItem = (sort_order: number): EditorItem => ({
  clientId: `draft-${Date.now()}`,
  sort_order,
  message: '',
  link_url: '',
  open_in_new_tab: false,
  is_active: true,
})

export default function SupportAnnouncementBarEditor() {
  const { toast } = useToast()
  const [barActive, setBarActive] = useState(true)
  const [autoplay, setAutoplay] = useState(true)
  const [speedMs, setSpeedMs] = useState(40)
  const [items, setItems] = useState<AnnouncementItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loadStatus, setLoadStatus] = useState('Loading announcement bar...')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<EditorItem>(emptyEditorItem(1))

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)),
    [items]
  )

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return setLoadStatus('You are not signed in.')

      const res = await fetch('/api/cms/support/announcement-bar', {
        headers: { authorization: `Bearer ${token}` },
      })
      const payload = (await res.json().catch(() => null)) as ApiPayload | null
      if (!res.ok) return setLoadStatus(payload?.error ?? 'Unable to load announcement bar.')

      if (payload?.section) {
        setBarActive(payload.section.is_active)
        setAutoplay(payload.section.autoplay)
        setSpeedMs(payload.section.speed_ms)
      }
      setItems((payload?.items ?? []).map((item) => ({ clientId: `id-${item.id}`, ...item })))
      setLoadStatus(payload?.items?.length ? 'Announcement bar loaded' : 'No announcement items found yet')
    })()
  }, [])

  const saveEditor = () =>
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.clientId === editorItem.clientId)
      const next = {
        ...editorItem,
        sort_order: Number.isFinite(editorItem.sort_order) ? editorItem.sort_order : 1,
      }
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], ...next }
        return copy
      }
      return [...prev, next]
    })

  const saveAll = async () => {
    setIsSaving(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      setIsSaving(false)
      return setLoadStatus('You are not signed in.')
    }

    const res = await fetch('/api/cms/support/announcement-bar', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        section: { is_active: barActive, autoplay, speed_ms: speedMs },
        items: sorted.map(({ sort_order, message, link_url, open_in_new_tab, is_active }) => ({
          sort_order,
          message,
          link_url,
          open_in_new_tab,
          is_active,
        })),
      }),
    })
    const payload = (await res.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)
    if (!res.ok) return setLoadStatus(payload?.error ?? 'Unable to save announcement bar.')

    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Announcement bar updated successfully.' })
    setLoadStatus('Announcement bar saved')
  }

  const nextOrder = Math.max(...items.map((item) => item.sort_order), 0) + 1

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/support" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Support
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Announcement Bar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the top scrolling announcement bar</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 max-w-4xl space-y-4">
        <label className="flex items-center gap-3 text-sm font-medium text-foreground">
          <input type="checkbox" checked={barActive} onChange={(e) => setBarActive(e.target.checked)} />
          Bar active
        </label>
        <label className="flex items-center gap-3 text-sm font-medium text-foreground">
          <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
          Autoplay marquee
        </label>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Speed (ms)</label>
          <input type="number" value={speedMs} onChange={(e) => setSpeedMs(Number(e.target.value) || 40)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Message</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Link</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Active</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.clientId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.message}</td>
                <td className="px-5 py-4 text-sm">{item.link_url || '-'}</td>
                <td className="px-5 py-4 text-sm">{item.is_active ? 'Yes' : 'No'}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => { setEditorItem(item); setEditorOpen(true) }} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary">
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => setItems((prev) => prev.filter((entry) => entry.clientId !== item.clientId))}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={() => { setEditorItem(emptyEditorItem(nextOrder)); setEditorOpen(true) }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
        <Plus size={16} />
        Add Announcement
      </button>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save announcement bar?"
        description="This will update the top announcement bar on the live site."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={saveAll}
        onCancel={() => setConfirmOpen(false)}
      />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update message, link, order, and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Message</label>
              <input value={editorItem.message} onChange={(e) => setEditorItem((prev) => ({ ...prev, message: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Link URL</label>
              <input value={editorItem.link_url} onChange={(e) => setEditorItem((prev) => ({ ...prev, link_url: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Sort Order</label>
              <input type="number" value={editorItem.sort_order} onChange={(e) => setEditorItem((prev) => ({ ...prev, sort_order: Number(e.target.value) || 1 }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input type="checkbox" checked={editorItem.open_in_new_tab} onChange={(e) => setEditorItem((prev) => ({ ...prev, open_in_new_tab: e.target.checked }))} />
              Open link in new tab
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
              <input type="checkbox" checked={editorItem.is_active} onChange={(e) => setEditorItem((prev) => ({ ...prev, is_active: e.target.checked }))} />
              Active
            </label>
          </div>
          <DialogFooter>
            <button onClick={() => setEditorOpen(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button>
            <button onClick={() => { saveEditor(); setEditorOpen(false) }} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">Update Item</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
