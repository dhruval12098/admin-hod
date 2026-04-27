'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
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

type TestimonialItem = {
  clientId: string
  id?: number
  sort_order: number
  quote: string
  author: string
}

type ApiPayload = {
  title?: string
  items?: Array<{
    id: number
    sort_order: number
    quote: string
    author: string
  }>
  error?: string
}

type EditorItem = {
  clientId: string
  sort_order: number
  quote: string
  author: string
}

export type TestimonialsInitialData = {
  title: string
  items: Array<{
    id: number
    sort_order: number
    quote: string
    author: string
  }>
}

const emptyEditorItem = (): EditorItem => ({
  clientId: `draft-${Date.now()}`,
  sort_order: 1,
  quote: '',
  author: '',
})

export function TestimonialsEditorClient({ initialData }: { initialData: TestimonialsInitialData }) {
  const { toast } = useToast()
  const [title, setTitle] = useState(initialData.title)
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    initialData.items.map((item) => ({
      clientId: `id-${item.id}`,
      ...item,
    }))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loadStatus, setLoadStatus] = useState(
    initialData.items.length ? 'Testimonials loaded' : 'No testimonial items found yet'
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('edit')
  const [editorItem, setEditorItem] = useState<EditorItem>(emptyEditorItem())

  const displayTestimonials = useMemo(() => {
    return [...testimonials].sort((a, b) => {
      const sortDiff = a.sort_order - b.sort_order
      if (sortDiff !== 0) return sortDiff
      return a.clientId.localeCompare(b.clientId)
    })
  }, [testimonials])

  const openAddEditor = () => {
    setEditorMode('add')
    setEditorItem({
      clientId: `draft-${Date.now()}`,
      sort_order: Math.max(...testimonials.map((item) => item.sort_order), 0) + 1,
      quote: '',
      author: '',
    })
    setEditorOpen(true)
  }

  const openEditEditor = (item: TestimonialItem) => {
    setEditorMode('edit')
    setEditorItem({
      clientId: item.clientId,
      sort_order: item.sort_order,
      quote: item.quote,
      author: item.author,
    })
    setEditorOpen(true)
  }

  const handleEditorChange = (field: 'quote' | 'author', value: string) => {
    setEditorItem((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const saveEditorItem = () => {
    setTestimonials((prev) => {
      const existingIndex = prev.findIndex((item) => item.clientId === editorItem.clientId)
      const nextItem: TestimonialItem = {
        ...editorItem,
        sort_order: Number.isFinite(editorItem.sort_order) ? editorItem.sort_order : 1,
      }

      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = { ...next[existingIndex], ...nextItem }
        return next
      }

      return [...prev, nextItem]
    })

    setLoadStatus('Draft updated locally. Save changes to publish.')
    setEditorOpen(false)
  }

  const handleDelete = (clientId: string) => {
    setTestimonials((prev) => prev.filter((item) => item.clientId !== clientId))
    setLoadStatus('Row removed locally. Save changes to publish.')
  }

  const handleSave = () => {
    setConfirmOpen(true)
  }

  const handleConfirmSave = async () => {
    setIsSaving(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setIsSaving(false)
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/testimonials', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title,
        items: displayTestimonials.map(({ sort_order, quote, author }) => ({
          sort_order,
          quote,
          author,
        })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null

    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save testimonials.')
      return
    }

    setLoadStatus('Testimonials saved')
    setConfirmOpen(false)
    toast({
      title: 'Saved',
      description: 'Testimonial marquee updated successfully.',
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <CmsSaveAction onClick={handleSave} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Testimonials Marquee</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the marquee title and testimonial items</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 max-w-4xl">
        <label className="mb-2 block text-sm font-semibold text-foreground">Section Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="max-w-4xl overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Quote</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Author</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayTestimonials.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-sm text-muted-foreground">
                  No testimonial items are loaded yet. Add one or check the `testimonial_marquee_items` table.
                </td>
              </tr>
            ) : (
              displayTestimonials.map((testimonial) => (
                <tr key={testimonial.clientId} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-4 text-sm text-foreground">{testimonial.sort_order}</td>
                  <td className="px-5 py-4 text-sm text-foreground">
                    <span className="block max-w-[520px] truncate" title={testimonial.quote}>
                      {testimonial.quote}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    <span className="block max-w-[240px] truncate" title={testimonial.author}>
                      {testimonial.author}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditEditor(testimonial)}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(testimonial.clientId)}
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={openAddEditor}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
      >
        <Plus size={16} />
        Add Testimonial
      </button>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save testimonial marquee?"
        description="This will update the homepage testimonial title and items."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmOpen(false)}
      />

      <Dialog open={editorOpen} onOpenChange={(open) => setEditorOpen(open)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editorMode === 'add' ? 'Add Testimonial' : 'Edit Testimonial'}</DialogTitle>
            <DialogDescription>
              Update the quote and author for this marquee item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Quote</label>
              <textarea
                value={editorItem.quote}
                onChange={(e) => handleEditorChange('quote', e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Author</label>
              <input
                type="text"
                value={editorItem.author}
                onChange={(e) => handleEditorChange('author', e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={saveEditorItem}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Update Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
