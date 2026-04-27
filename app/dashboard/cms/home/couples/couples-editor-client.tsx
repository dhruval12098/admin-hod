'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Edit2, Plus } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { useToast } from '@/hooks/use-toast'
import { saveCouples, type CoupleItem, type CoupleSection } from '@/lib/couples-cms'

export type CouplesInitialData = {
  section: CoupleSection
  items: Array<{
    id: number
    sort_order: number
    names: string
    location: string
    story: string
    product_name: string
    product_link: string
    product_detail: string
    image_path: string
  }>
}

export function CouplesEditorClient({ initialData }: { initialData: CouplesInitialData }) {
  const { toast } = useToast()
  const [eyebrow, setEyebrow] = useState(initialData.section.eyebrow)
  const [heading, setHeading] = useState(initialData.section.heading)
  const [subtitle, setSubtitle] = useState(initialData.section.subtitle)
  const [items, setItems] = useState<CoupleItem[]>(
    initialData.items.map((item) => ({
      clientId: `id-${item.id}`,
      id: item.id,
      sort_order: Number(item.sort_order ?? 0),
      names: item.names ?? '',
      location: item.location ?? '',
      story: item.story ?? '',
      product_name: item.product_name ?? '',
      product_link: item.product_link ?? '',
      product_detail: item.product_detail ?? '',
      image_path: item.image_path ?? '',
    }))
  )
  const [loadStatus, setLoadStatus] = useState(initialData.items.length ? 'Couples loaded' : 'No couples found yet')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)), [items])

  const saveAll = async () => {
    setIsSaving(true)
    const result = await saveCouples({ eyebrow, heading, subtitle }, sorted)
    setIsSaving(false)

    if ('error' in result) {
      setLoadStatus(result.error ?? 'Unable to save couples.')
      return
    }

    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Couples updated successfully.' })
    setLoadStatus('Couples saved')
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Couples</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the couples section cards and open each item on its own page.</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-6 max-w-4xl space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
          <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
          <input value={heading} onChange={(e) => setHeading(e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label>
          <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={3} className={inputClassName} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Names</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Image</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.clientId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm">{item.names}</td>
                <td className="px-5 py-4 text-sm">{item.image_path}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/dashboard/cms/home/couples/${item.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <Edit2 size={14} />
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-sm text-muted-foreground">
                  No couples added yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Link href="/dashboard/cms/home/couples/new" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
        <Plus size={16} />
        Add Couple
      </Link>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save couples?"
        description="This will update the couples section on the homepage."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={saveAll}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}

const inputClassName = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm'
