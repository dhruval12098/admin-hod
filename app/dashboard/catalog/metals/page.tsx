'use client'

import { useMemo, useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type MetalItem = {
  id: string
  name: string
  karat: string
  color: string
}

const INITIAL_METALS: MetalItem[] = [
  { id: '1', name: '18K Yellow Gold', karat: '18K', color: '#D4AF37' },
  { id: '2', name: '18K Rose Gold', karat: '18K', color: '#D9A0A0' },
  { id: '3', name: '18K White Gold', karat: '18K', color: '#D9D9D9' },
  { id: '4', name: '14K Yellow Gold', karat: '14K', color: '#E1BE4F' },
  { id: '5', name: 'Platinum', karat: 'PT950', color: '#C6CCD3' },
  { id: '6', name: '925 Silver', karat: '925', color: '#D8DEE5' },
]

export default function MetalsPage() {
  const [items, setItems] = useState<MetalItem[]>(INITIAL_METALS)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', karat: '18K', color: '#D4AF37' })

  const nextId = useMemo(() => String(items.length + 1), [items.length])

  const openNew = () => {
    setEditingId(null)
    setFormData({ name: '', karat: '18K', color: '#D4AF37' })
    setIsDialogOpen(true)
  }

  const openEdit = (item: MetalItem) => {
    setEditingId(item.id)
    setFormData({ name: item.name, karat: item.karat, color: item.color })
    setIsDialogOpen(true)
  }

  const saveItem = () => {
    if (!formData.name.trim()) return

    if (editingId) {
      setItems((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, name: formData.name, karat: formData.karat, color: formData.color } : item))
      )
    } else {
      setItems((prev) => [...prev, { id: nextId, name: formData.name, karat: formData.karat, color: formData.color }])
    }

    setIsDialogOpen(false)
    setEditingId(null)
  }

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Metals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage metal master data for product configuration.</p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
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
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Karat</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Color Swatch</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Edit</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Delete</th>
              </tr>
            </thead>
            <tbody>
              {items.map((metal) => (
                <tr key={metal.id} className="border-b border-border hover:bg-secondary/20">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{metal.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{metal.karat}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: metal.color }} />
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => openEdit(metal)} className="rounded p-1.5 hover:bg-secondary transition-colors">
                      <Edit2 size={14} className="text-muted-foreground" />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => deleteItem(metal.id)} className="rounded p-1.5 hover:bg-red-100 transition-colors">
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Metal' : 'Add New Metal'}</DialogTitle>
            <DialogDescription>Use this popup to add or edit metal records.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Metal Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Karat</label>
              <Select value={formData.karat} onValueChange={(value) => setFormData((prev) => ({ ...prev, karat: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select karat" />
                </SelectTrigger>
                <SelectContent>
                  {['10K', '14K', '18K', '22K', 'Platinum', '925'].map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                className="h-10 w-16 rounded border border-border bg-white p-1"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={saveItem} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                Save
              </button>
              <button type="button" onClick={() => setIsDialogOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
