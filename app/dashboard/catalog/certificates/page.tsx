'use client'

import { useMemo, useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type CertificateItem = {
  id: string
  name: string
  code: string
}

const INITIAL_CERTIFICATES: CertificateItem[] = [
  { id: '1', name: 'IGI', code: 'IGI' },
  { id: '2', name: 'GIA', code: 'GIA' },
  { id: '3', name: 'None', code: 'NONE' },
]

export default function CertificatesPage() {
  const [items, setItems] = useState<CertificateItem[]>(INITIAL_CERTIFICATES)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '' })

  const nextId = useMemo(() => String(items.length + 1), [items.length])

  const openNew = () => {
    setEditingId(null)
    setFormData({ name: '', code: '' })
    setIsDialogOpen(true)
  }

  const openEdit = (item: CertificateItem) => {
    setEditingId(item.id)
    setFormData({ name: item.name, code: item.code })
    setIsDialogOpen(true)
  }

  const saveItem = () => {
    if (!formData.name.trim() || !formData.code.trim()) return

    if (editingId) {
      setItems((prev) => prev.map((item) => (item.id === editingId ? { ...item, name: formData.name, code: formData.code } : item)))
    } else {
      setItems((prev) => [...prev, { id: nextId, name: formData.name, code: formData.code }])
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
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Certificates</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage certificate options for product records.</p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus size={16} />
          Add New Certificate
        </button>
      </div>

      <div className="rounded-lg border border-border bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Certificate Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Short Code</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Edit</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">Delete</th>
              </tr>
            </thead>
            <tbody>
              {items.map((certificate) => (
                <tr key={certificate.id} className="border-b border-border hover:bg-secondary/20">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{certificate.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{certificate.code}</td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => openEdit(certificate)} className="rounded p-1.5 hover:bg-secondary transition-colors">
                      <Edit2 size={14} className="text-muted-foreground" />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => deleteItem(certificate.id)} className="rounded p-1.5 hover:bg-red-100 transition-colors">
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
            <DialogTitle>{editingId ? 'Edit Certificate' : 'Add New Certificate'}</DialogTitle>
            <DialogDescription>Use this popup to add or edit certificate records.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Certificate Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Short Code</label>
              <input
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
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
