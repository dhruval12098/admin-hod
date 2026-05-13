'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export type MetalItem = {
  id: string
  name: string
  slug: string
  color_hex: string | null
  composition_description?: string | null
  display_order: number
  status: 'active' | 'hidden'
  composition_parts?: {
    id?: number
    part_name: string
    percentage: number
    color_hex?: string | null
    sort_order: number
  }[]
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function MetalsClient({ initialItems }: { initialItems: MetalItem[] }) {
  const { toast } = useToast()
  const [items, setItems] = useState<MetalItem[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MetalItem | null>(null)

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

        <Link href="/dashboard/catalog/metals/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
          <Plus size={16} />
          Add New Metal
        </Link>
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
                    <Link href={`/dashboard/catalog/metals/${metal.id}`} className="rounded p-1.5 hover:bg-secondary transition-colors">
                      <Edit2 size={14} className="text-muted-foreground" />
                    </Link>
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
