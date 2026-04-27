'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TablePagination } from '@/components/table-pagination'

export type ProductRow = {
  id: string
  slug: string
  name: string
  sku: string
  productLane?: 'standard' | 'hiphop' | 'collection'
  categoryPath: string
  type: string
  price: number | null
  stock: number
  featured: boolean
  status: string
  detailTemplate?: 'standard' | 'hiphop'
  mainCategorySlug?: string
  mainCategoryName?: string
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
const PAGE_SIZE = 20

function matchesLane(product: ProductRow, lane: 'standard' | 'hiphop' | 'collection') {
  const productLane = product.productLane ?? 'standard'
  return productLane === lane
}

export function ProductsClient({
  initialProducts,
  lane,
  title,
  description,
  createHref,
  createLabel,
  editBaseHref,
  emptyMessage,
}: {
  initialProducts: ProductRow[]
  lane: 'standard' | 'hiphop' | 'collection'
  title: string
  description: string
  createHref?: string
  createLabel?: string
  editBaseHref: string
  emptyMessage: string
}) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [page, setPage] = useState(1)

  const loadProducts = async () => {
    setLoading(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return
      const response = await fetch('/api/products', {
        headers: { authorization: `Bearer ${accessToken}` },
      })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.items) {
        setProducts(payload.items.filter((product: ProductRow) => matchesLane(product, lane)))
        setPage(1)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.categoryPath.toLowerCase().includes(search.toLowerCase()) ||
          product.sku.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  )
  const visibleProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredProducts.slice(start, start + PAGE_SIZE)
  }, [filteredProducts, page])

  const deleteProduct = async (id: string) => {
    setDeleteLoading(true)
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setDeleteLoading(false)
      return
    }
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (response.ok) {
      setDeleteTarget(null)
      await loadProducts()
    }
    setDeleteLoading(false)
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {createHref && createLabel ? (
          <Link
            href={createHref}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors duration-200"
          >
            <Plus size={18} />
            {createLabel}
          </Link>
        ) : null}
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Category</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Type</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Price</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Stock</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Featured</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id} className="border-b border-border hover:bg-secondary/30 transition-colors duration-150">
                  <td className="px-6 py-3.5 text-sm font-medium text-foreground">{product.name}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{product.categoryPath}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{product.type}</td>
                  <td className="px-6 py-3.5 text-sm font-jakarta font-semibold text-foreground">{product.price == null ? '-' : `$${product.price.toLocaleString()}`}</td>
                  <td className="px-6 py-3.5 text-sm font-jakarta font-bold text-foreground">{product.stock}</td>
                  <td className="px-6 py-3.5">
                    {product.featured ? <CheckCircle2 size={16} className="text-primary" /> : <Circle size={16} className="text-muted-foreground" />}
                  </td>
                  <td className="px-6 py-3.5 text-sm">
                    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${product.status === 'active' ? 'bg-green-100 text-green-700' : product.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                      {product.status === 'active' ? 'Active' : product.status === 'draft' ? 'Draft' : product.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Link href={`${editBaseHref}/${product.slug}`} className="rounded p-1.5 hover:bg-secondary transition-colors" title="Edit">
                        <Edit2 size={14} className="text-muted-foreground" />
                      </Link>
                      <button onClick={() => setDeleteTarget(product)} className="rounded p-1.5 hover:bg-red-100 transition-colors" title="Delete">
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

      {loading ? (
        <div className="mt-8 text-sm text-muted-foreground">Updating products...</div>
      ) : null}

      {!loading && filteredProducts.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : null}
      {filteredProducts.length > PAGE_SIZE ? (
        <TablePagination page={page} totalItems={filteredProducts.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete this product?"
        description={`This will remove product${deleteTarget?.name ? ` "${deleteTarget.name}"` : ''} from the admin and storefront.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        type="delete"
        isLoading={deleteLoading}
        onConfirm={() => (deleteTarget ? void deleteProduct(deleteTarget.id) : undefined)}
        onCancel={() => {
          if (!deleteLoading) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
