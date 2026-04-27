'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export type ProductListItem = {
  id: string
  name: string
  slug: string
  categoryPath: string
  detailTemplate: 'standard' | 'hiphop'
  status: string
}

type EditorState = {
  eyebrow: string
  heading: string
  cta_label: string
  cta_href: string
  selected_product_ids: string[]
}

export type HomeBestSellersInitialData = {
  section: EditorState
  products: ProductListItem[]
}

export function HomeBestSellersEditorClient({ initialData }: { initialData: HomeBestSellersInitialData }) {
  const { toast } = useToast()
  const [form, setForm] = useState<EditorState>(initialData.section)
  const [products] = useState<ProductListItem[]>(initialData.products)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Best sellers loaded')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) =>
      [product.name, product.slug, product.categoryPath, product.detailTemplate]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    )
  }, [products, search])

  const selectedProducts = useMemo(
    () =>
      form.selected_product_ids
        .map((id) => products.find((product) => product.id === id))
        .filter(Boolean) as ProductListItem[],
    [form.selected_product_ids, products]
  )

  const toggleProduct = (id: string) => {
    setForm((current) => ({
      ...current,
      selected_product_ids: current.selected_product_ids.includes(id)
        ? current.selected_product_ids.filter((value) => value !== id)
        : [...current.selected_product_ids, id],
    }))
  }

  const moveSelected = (id: string, direction: -1 | 1) => {
    setForm((current) => {
      const index = current.selected_product_ids.indexOf(id)
      const nextIndex = index + direction
      if (index === -1 || nextIndex < 0 || nextIndex >= current.selected_product_ids.length) return current

      const nextIds = [...current.selected_product_ids]
      const [item] = nextIds.splice(index, 1)
      nextIds.splice(nextIndex, 0, item)
      return { ...current, selected_product_ids: nextIds }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setIsSaving(false)
      setStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/bestsellers', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(form),
    })

    const payload = await response.json().catch(() => null)
    setIsSaving(false)

    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save best sellers.')
      return
    }

    setConfirmOpen(false)
    setStatus('Best sellers saved')
    toast({ title: 'Saved', description: 'Homepage best sellers updated successfully.' })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Best Sellers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select existing products to display in the homepage best sellers section.</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4 rounded-lg border border-border bg-white p-6 shadow-xs">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
            <input value={form.eyebrow} onChange={(e) => setForm((prev) => ({ ...prev, eyebrow: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
            <input value={form.heading} onChange={(e) => setForm((prev) => ({ ...prev, heading: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">CTA Label</label>
              <input value={form.cta_label} onChange={(e) => setForm((prev) => ({ ...prev, cta_label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">CTA Link</label>
              <input value={form.cta_href} onChange={(e) => setForm((prev) => ({ ...prev, cta_href: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <h2 className="text-sm font-semibold text-foreground">Selected Products</h2>
            <p className="mt-1 text-xs text-muted-foreground">These products will render on the homepage in this exact order.</p>
            <div className="mt-4 space-y-3">
              {selectedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products selected yet.</p>
              ) : (
                selectedProducts.map((product, index) => (
                  <div key={product.id} className="rounded-lg border border-border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{index + 1}. {product.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{product.categoryPath}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => moveSelected(product.id, -1)} className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-secondary">
                        Up
                      </button>
                      <button type="button" onClick={() => moveSelected(product.id, 1)} className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-secondary">
                        Down
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Choose Existing Products</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick the products you want to display in the homepage best sellers section.</p>
            </div>
            <div className="w-full max-w-[320px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Select</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Path</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Template</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const checked = form.selected_product_ids.includes(product.id)
                  return (
                    <tr key={product.id} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-4">
                        <input type="checkbox" checked={checked} onChange={() => toggleProduct(product.id)} />
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">{product.name}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{product.categoryPath}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{product.detailTemplate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save best sellers?"
        description="This will update the homepage best sellers section."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={handleSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
