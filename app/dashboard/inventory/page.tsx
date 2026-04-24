'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type InventoryItem = {
  id: string
  name: string
  slug: string
  sku: string
  stockQuantity: number
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  categoryPath: string
  updatedAt: string
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(options.headers)
  if (data.session?.access_token) headers.set('authorization', `Bearer ${data.session.access_token}`)
  if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json')
  return fetch(url, { ...options, headers })
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftStock, setDraftStock] = useState('')

  useEffect(() => {
    void loadItems()
  }, [])

  async function loadItems(query = '') {
    const response = await authedFetch(`/api/inventory${query ? `?q=${encodeURIComponent(query)}` : ''}`)
    const payload = await response.json().catch(() => null)
    if (response.ok) setItems(payload?.items ?? [])
  }

  async function handleStockUpdate(id: string) {
    const response = await authedFetch(`/api/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock_quantity: Number(draftStock || 0) }),
    })
    if (response.ok) {
      await loadItems(search)
      setEditingId(null)
      setDraftStock('')
    }
  }

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.categoryPath.toLowerCase().includes(search.toLowerCase()) ||
          item.sku.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  )

  return (
    <div className="p-8">
      <div className="mb-10">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage product stock levels and keep inventory synced with orders.</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by product name or variant..."
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Product Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Catalog Path</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">SKU</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Current Stock</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Last Updated</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr 
                  key={item.id} 
                  className={`border-b border-border transition-colors duration-150 ${
                    item.status === 'out-of-stock' 
                      ? 'bg-red-50 hover:bg-red-100/50' 
                      : 'hover:bg-secondary/30'
                  }`}
                >
                  <td className="px-6 py-3.5 text-sm font-medium text-foreground">{item.name}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{item.categoryPath || 'Unassigned'}</td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{item.sku || 'No SKU'}</td>
                  <td className="px-6 py-3.5">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        min="0"
                        value={draftStock}
                        onChange={(e) => setDraftStock(e.target.value)}
                        autoFocus
                        onBlur={() => setEditingId(null)}
                        className="w-20 rounded-md border border-primary px-2 py-1 text-sm font-jakarta font-semibold"
                      />
                    ) : (
                      <span className="font-jakarta font-bold text-foreground text-base">{item.stockQuantity}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                        item.status === 'in-stock'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'low-stock'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.status === 'in-stock' ? 'In Stock' : item.status === 'low-stock' ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      {editingId === item.id ? (
                        <button onClick={() => void handleStockUpdate(item.id)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary">
                          Update
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(item.id)
                            setDraftStock(String(item.stockQuantity))
                          }}
                          className="rounded-md p-1.5 hover:bg-secondary transition-colors"
                          title="Edit Stock"
                        >
                          <Edit2 size={14} className="text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredItems.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">No products found.</p>
        </div>
      )}
    </div>
  )
}
