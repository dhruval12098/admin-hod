'use client'

import { useMemo, useState } from 'react'
import { Edit2, Plus, TicketPercent, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { TablePagination } from '@/components/table-pagination'

export type CouponRow = {
  id: number
  code: string
  title: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  usage_limit: number | null
  usage_count: number
  is_active: boolean
  created_at?: string
}

type CouponEditor = {
  id?: number
  code: string
  title: string
  discount_type: 'percentage' | 'fixed'
  discount_value: string
  usage_limit: string
  is_active: boolean
}

const emptyEditor: CouponEditor = {
  code: '',
  title: '',
  discount_type: 'percentage',
  discount_value: '',
  usage_limit: '',
  is_active: true,
}
const PAGE_SIZE = 20

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function CouponsClient({ initialItems }: { initialItems: CouponRow[] }) {
  const { toast } = useToast()
  const [items, setItems] = useState<CouponRow[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editor, setEditor] = useState<CouponEditor>(emptyEditor)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  const sortedItems = useMemo(() => [...items], [items])
  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedItems.slice(start, start + PAGE_SIZE)
  }, [page, sortedItems])

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return

      const response = await fetch('/api/coupons', {
        headers: { authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json().catch(() => null)
      if (response.ok) {
        setItems(Array.isArray(payload?.items) ? payload.items : [])
        setPage(1)
      }
    } finally {
      setLoading(false)
    }
  }

  const openNew = () => {
    setEditor(emptyEditor)
    setEditorOpen(true)
  }

  const openEdit = (item: CouponRow) => {
    setEditor({
      id: item.id,
      code: item.code,
      title: item.title ?? '',
      discount_type: item.discount_type,
      discount_value: String(item.discount_value ?? ''),
      usage_limit: item.usage_limit == null ? '' : String(item.usage_limit),
      is_active: item.is_active,
    })
    setEditorOpen(true)
  }

  const saveCoupon = async () => {
    setSaving(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return

      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...editor,
          discount_value: Number(editor.discount_value),
          usage_limit: editor.usage_limit === '' ? null : Number(editor.usage_limit),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast({
          title: 'Save failed',
          description: payload?.error ?? 'Unable to save coupon.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: editor.id ? 'Coupon updated' : 'Coupon created',
        description: `${editor.code || 'Coupon'} saved successfully.`,
      })
      setEditorOpen(false)
      await loadCoupons()
    } finally {
      setSaving(false)
    }
  }

  const deleteCoupon = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return

      const response = await fetch(`/api/coupons/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast({
          title: 'Delete failed',
          description: payload?.error ?? 'Unable to delete coupon.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Coupon deleted',
        description: `${deleteTarget.code} was removed.`,
      })
      setDeleteTarget(null)
      await loadCoupons()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create discount codes for checkout redemption.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <Plus size={18} />
          Add Coupon
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Code</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Title</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Value</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Usage</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-b border-border transition-colors duration-150 hover:bg-secondary/30">
                  <td className="px-6 py-4 text-sm font-semibold text-foreground">{item.code}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{item.title || '-'}</td>
                  <td className="px-6 py-4 text-sm capitalize text-muted-foreground">{item.discount_type}</td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {item.discount_type === 'percentage' ? `${item.discount_value}%` : `$${item.discount_value}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.usage_count}/{item.usage_limit ?? '∞'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(item)} className="rounded p-1.5 transition-colors hover:bg-secondary" title="Edit">
                        <Edit2 size={14} className="text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteTarget(item)} className="rounded p-1.5 transition-colors hover:bg-red-100" title="Delete">
                        <Trash2 size={14} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? <div className="mt-8 text-sm text-muted-foreground">Updating coupons...</div> : null}
      {!loading && sortedItems.length === 0 ? <div className="mt-8 text-sm text-muted-foreground">No coupons created yet.</div> : null}
      {sortedItems.length > PAGE_SIZE ? (
        <TablePagination page={page} totalItems={sortedItems.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      ) : null}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editor.id ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>Set the code, discount type, discount value, and usage limit.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Coupon Code</label>
              <input
                value={editor.code}
                onChange={(event) => setEditor((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                placeholder="WELCOME10"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
              <input
                value={editor.title}
                onChange={(event) => setEditor((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Welcome Offer"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Discount Type</label>
                <select
                  value={editor.discount_type}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      discount_type: event.target.value === 'fixed' ? 'fixed' : 'percentage',
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Discount Value</label>
                <input
                  type="number"
                  min="0"
                  value={editor.discount_value}
                  onChange={(event) => setEditor((prev) => ({ ...prev, discount_value: event.target.value }))}
                  placeholder={editor.discount_type === 'percentage' ? '10' : '500'}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Usage Limit</label>
                <input
                  type="number"
                  min="1"
                  value={editor.usage_limit}
                  onChange={(event) => setEditor((prev) => ({ ...prev, usage_limit: event.target.value }))}
                  placeholder="100"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                />
              </div>
              <label className="mt-8 flex items-center gap-2 text-sm font-medium text-foreground sm:mt-9">
                <input
                  type="checkbox"
                  checked={editor.is_active}
                  onChange={(event) => setEditor((prev) => ({ ...prev, is_active: event.target.checked }))}
                  className="rounded border-border"
                />
                Active
              </label>
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
              onClick={() => void saveCoupon()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              <TicketPercent size={14} />
              {saving ? 'Saving...' : editor.id ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete this coupon?"
        description={`This will remove coupon${deleteTarget?.code ? ` "${deleteTarget.code}"` : ''}.`}
        confirmText="Delete Coupon"
        cancelText="Cancel"
        type="delete"
        isLoading={deleting}
        onConfirm={() => void deleteCoupon()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
