'use client'

import { useMemo, useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { slugify } from '@/lib/product-catalog'

export type MetalItem = {
  id: string
  name: string
  slug: string
  color_hex: string | null
  display_order: number
  status: 'active' | 'hidden'
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function MetalsClient({ initialItems }: { initialItems: MetalItem[] }) {
  const { toast } = useToast()
  const [items, setItems] = useState<MetalItem[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MetalItem | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', color_hex: '#D4AF37', display_order: 1, status: 'active' as 'active' | 'hidden' })

  const nextOrder = useMemo(() => (items.at(-1)?.display_order ?? items.length) + 1, [items])

  const loadItems = async () => {
    setLoading(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return
      const response = await fetch('/api/catalog/metals', { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.items) {
        toast({ title: 'Load failed', description: payload?.error ?? 'Unable to load metals.', variant: 'destructive' })
        return
      }
      setItems(payload.items)
    } finally {
      setLoading(false)
    }
  }

  const openNew = () => {
    setEditingId(null)
    setFormData({ name: '', slug: '', color_hex: '#D4AF37', display_order: nextOrder, status: 'active' })
    setIsDialogOpen(true)
  }

  const openEdit = (item: MetalItem) => {
    setEditingId(item.id)
    setFormData({
      name: item.name,
      slug: item.slug,
      color_hex: item.color_hex || '#D4AF37',
      display_order: item.display_order,
      status: item.status,
    })
    setIsDialogOpen(true)
  }

  const saveItem = async () => {
    const accessToken = await getAccessToken()
    if (!accessToken) return

    const response = await fetch(editingId ? `/api/catalog/metals/${editingId}` : '/api/catalog/metals', {
      method: editingId ? 'PATCH' : 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        slug: formData.slug,
        color_hex: formData.color_hex,
        display_order: formData.display_order,
        status: formData.status,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save metal.', variant: 'destructive' })
      return
    }

    await loadItems()
    setIsDialogOpen(false)
    setEditingId(null)
    toast({ title: 'Saved', description: 'Metal master updated successfully.' })
  }

  const deleteItem = async (id: string) => {
    const accessToken = await getAccessToken()
    if (!accessToken) return

    const response = await fetch(`/api/catalog/metals/${id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      toast({ title: 'Delete failed', description: payload?.error ?? 'Unable to delete metal.', variant: 'destructive' })
      return
    }

    await loadItems()
    setDeleteTarget(null)
    toast({ title: 'Deleted', description: 'Metal removed successfully.' })
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Metals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage metal master data for product configuration.</p>
        </div>

        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
          <Plus size={16} />
          Add New Metal
        </button>
      </div>

      <div className="rounded-lg border border-border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Metal Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Slug</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Color Swatch</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Edit</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Delete</th>
              </tr>
            </thead>
            <tbody>
              {items.map((metal) => (
                <tr key={metal.id} className="border-b border-border hover:bg-secondary/20">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{metal.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{metal.slug}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: metal.color_hex || '#D4AF37' }} />
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${metal.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {metal.status === 'active' ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => openEdit(metal)} className="rounded p-1.5 hover:bg-secondary transition-colors">
                      <Edit2 size={14} className="text-muted-foreground" />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => setDeleteTarget(metal)} className="rounded p-1.5 hover:bg-red-100 transition-colors">
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 text-sm text-muted-foreground">Updating metals...</div>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Metal' : 'Add New Metal'}</DialogTitle>
            <DialogDescription>Manage the real metal master data used by products and navbar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Metal Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value, slug: prev.slug === '' || prev.slug === slugify(prev.name) ? slugify(e.target.value) : prev.slug }))}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Slug</label>
              <input value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Color</label>
              <input type="color" value={formData.color_hex} onChange={(e) => setFormData((prev) => ({ ...prev, color_hex: e.target.value }))} className="h-10 w-16 rounded border border-border bg-white p-1" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Display Order</label>
              <input type="number" value={formData.display_order} onChange={(e) => setFormData((prev) => ({ ...prev, display_order: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Status</label>
              <div className="flex flex-wrap gap-2">
                {(['active', 'hidden'] as const).map((status) => (
                  <button key={status} type="button" onClick={() => setFormData((prev) => ({ ...prev, status }))} className={`rounded-full px-4 py-2 text-sm font-semibold ${formData.status === status ? 'bg-primary text-white' : 'border border-border text-foreground hover:bg-secondary'}`}>
                    {status === 'active' ? 'Active' : 'Hidden'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => void saveItem()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">Save</button>
              <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete metal?"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmText="Delete"
        type="delete"
        onConfirm={() => {
          if (!deleteTarget) return
          void deleteItem(deleteTarget.id)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
