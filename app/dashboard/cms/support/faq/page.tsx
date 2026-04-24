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

type FaqItem = {
  clientId: string
  id?: number
  sort_order: number
  question: string
  answer: string
  is_active: boolean
}

type ApiPayload = {
  section?: { section_key: string; title: string; subtitle: string }
  items?: Array<{ id: number; sort_order: number; question: string; answer: string; is_active: boolean }>
  error?: string
}

type EditorItem = {
  clientId: string
  sort_order: number
  question: string
  answer: string
  is_active: boolean
}

const emptyEditorItem = (sort_order: number): EditorItem => ({
  clientId: `draft-${Date.now()}`,
  sort_order,
  question: '',
  answer: '',
  is_active: true,
})

export default function SupportFaqEditor() {
  const { toast } = useToast()
  const [title, setTitle] = useState('Frequently Asked Questions')
  const [subtitle, setSubtitle] = useState('Everything customers usually ask before ordering.')
  const [items, setItems] = useState<FaqItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loadStatus, setLoadStatus] = useState('Loading FAQ content...')
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

      const res = await fetch('/api/cms/support/faq', {
        headers: { authorization: `Bearer ${token}` },
      })
      const payload = (await res.json().catch(() => null)) as ApiPayload | null
      if (!res.ok) return setLoadStatus(payload?.error ?? 'Unable to load FAQ content.')

      if (payload?.section) {
        setTitle(payload.section.title)
        setSubtitle(payload.section.subtitle)
      }
      setItems((payload?.items ?? []).map((item) => ({ clientId: `id-${item.id}`, ...item })))
      setLoadStatus(payload?.items?.length ? 'FAQ content loaded' : 'No FAQ items found yet')
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

    const res = await fetch('/api/cms/support/faq', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        section: { title, subtitle },
        items: sorted.map(({ sort_order, question, answer, is_active }) => ({
          sort_order,
          question,
          answer,
          is_active,
        })),
      }),
    })
    const payload = (await res.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)
    if (!res.ok) return setLoadStatus(payload?.error ?? 'Unable to save FAQ content.')

    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'FAQ content updated successfully.' })
    setLoadStatus('FAQ content saved')
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
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">FAQ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage support questions and answers</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 max-w-4xl space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label>
          <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Question</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Active</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.clientId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.question}</td>
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
        Add FAQ
      </button>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save FAQ content?"
        description="This will update the FAQ section on the live site."
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
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription>Update question, answer, order, and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Question</label>
              <input value={editorItem.question} onChange={(e) => setEditorItem((prev) => ({ ...prev, question: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Answer</label>
              <textarea value={editorItem.answer} onChange={(e) => setEditorItem((prev) => ({ ...prev, answer: e.target.value }))} rows={5} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Sort Order</label>
              <input type="number" value={editorItem.sort_order} onChange={(e) => setEditorItem((prev) => ({ ...prev, sort_order: Number(e.target.value) || 1 }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
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
