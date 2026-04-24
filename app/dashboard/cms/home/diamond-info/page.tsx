'use client'

import Link from 'next/link'
import { useEffect, useState, type ChangeEvent } from 'react'
import { ArrowLeft, Edit2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type DiamondInfoItem = {
  sort_order: number
  label: string
  heading: string
  paragraph: string
}

type ApiPayload = {
  items?: DiamondInfoItem[]
  error?: string
}

export default function DiamondInfoEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<DiamondInfoItem[]>([
    { sort_order: 1, label: '', heading: '', paragraph: '' },
    { sort_order: 2, label: '', heading: '', paragraph: '' },
    { sort_order: 3, label: '', heading: '', paragraph: '' },
  ])
  const [loadStatus, setLoadStatus] = useState('Loading Diamond Info...')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<DiamondInfoItem | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setLoadStatus('You are not signed in.')
        return
      }

      const response = await fetch('/api/cms/home/diamond-info', {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = (await response.json().catch(() => null)) as ApiPayload | null

      if (!response.ok) {
        setLoadStatus(payload?.error ?? 'Unable to load Diamond Info.')
        return
      }

      const nextItems = payload?.items ?? []
      setItems(
        nextItems.length
          ? nextItems
          : [
              { sort_order: 1, label: '', heading: '', paragraph: '' },
              { sort_order: 2, label: '', heading: '', paragraph: '' },
              { sort_order: 3, label: '', heading: '', paragraph: '' },
            ]
      )

      setLoadStatus(nextItems.length ? 'Diamond Info loaded' : 'No Diamond Info rows found yet')
    }

    load()
  }, [])

  const handleChange = (sortOrder: number, field: keyof DiamondInfoItem, value: string) => {
    setItems((prev) => prev.map((item) => (item.sort_order === sortOrder ? { ...item, [field]: value } : item)))
  }

  const openEditor = (item: DiamondInfoItem) => {
    setEditorItem(item)
    setEditorOpen(true)
  }

  const updateAndSave = async () => {
    if (!editorItem) return

    const nextItems = items.map((item) => (item.sort_order === editorItem.sort_order ? editorItem : item))
    setItems(nextItems)
    setEditorOpen(false)
    setLoadStatus('Saving Diamond Info item...')

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/diamond-info', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ items: nextItems }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Diamond Info.')
      return
    }

    setLoadStatus('Diamond Info saved')
    toast({
      title: 'Saved',
      description: 'Diamond Info updated successfully.',
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard/cms/home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Diamond Info</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the three informational text blocks below the hero</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Label</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Heading</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Paragraph</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.sort_order} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm text-foreground">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm text-foreground">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleChange(item.sort_order, 'label', e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </td>
                <td className="px-5 py-4 text-sm text-foreground">
                  <span className="block max-w-[220px] truncate" title={item.heading}>
                    {item.heading}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  <span className="block max-w-[420px] truncate" title={item.paragraph}>
                    {item.paragraph}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditor(item)}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Diamond Info</DialogTitle>
            <DialogDescription>
              Update the label, heading, and paragraph for this block.
            </DialogDescription>
          </DialogHeader>

          {editorItem && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Label</label>
                <input
                  type="text"
                  value={editorItem.label}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, label: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
                <input
                  type="text"
                  value={editorItem.heading}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, heading: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Paragraph</label>
                <textarea
                  value={editorItem.paragraph}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, paragraph: e.target.value } : prev))
                  }
                  rows={5}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={updateAndSave}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Update Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
