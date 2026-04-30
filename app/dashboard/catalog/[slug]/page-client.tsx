'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TablePagination } from '@/components/table-pagination'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { CatalogCategory, CatalogOption, CatalogSubcategory } from '@/lib/product-catalog'
import { slugify } from '@/lib/product-catalog'

type CatalogDetailTab = 'subcategories' | 'options'

type SubcategoryFormState = {
  name: string
  slug: string
  parentCategoryId: string
  iconSvgPath: string
  displayOrder: number
  status: 'Active' | 'Hidden'
}

type OptionFormState = {
  name: string
  slug: string
  parentSubcategoryId: string
  iconSvgPath: string
  displayOrder: number
  status: 'Active' | 'Hidden'
}

type CategoryDetailClientProps = {
  categorySlug: string
  initialData: {
    category: CatalogCategory | null
    subcategories: CatalogSubcategory[]
    options: CatalogOption[]
  }
}

const PAGE_SIZE = 20

function emptySubcategoryForm(categoryId: string, nextOrder: number): SubcategoryFormState {
  return {
    name: '',
    slug: '',
    parentCategoryId: categoryId,
    iconSvgPath: '',
    displayOrder: nextOrder,
    status: 'Active',
  }
}

function emptyOptionForm(subcategoryId: string, nextOrder: number): OptionFormState {
  return {
    name: '',
    slug: '',
    parentSubcategoryId: subcategoryId,
    iconSvgPath: '',
    displayOrder: nextOrder,
    status: 'Active',
  }
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken()
  const headers = new Headers(options.headers)
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)
  if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json')
  return fetch(url, { ...options, headers })
}

async function uploadCatalogSvg(kind: 'subcategories' | 'options', file: File) {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('You must be signed in to upload SVG files.')
  }

  const payload = new FormData()
  payload.append('file', file)

  const response = await fetch(`/api/catalog/${kind}/upload`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: payload,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.path) {
    throw new Error(data?.error ?? 'Unable to upload SVG.')
  }

  return data.path as string
}

export function CategoryDetailClient({ categorySlug, initialData }: CategoryDetailClientProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<CatalogDetailTab>('subcategories')
  const [category, setCategory] = useState<CatalogCategory | null>(initialData.category)
  const [subcategories, setSubcategories] = useState<CatalogSubcategory[]>(initialData.subcategories)
  const [options, setOptions] = useState<CatalogOption[]>(initialData.options)

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await authedFetch('/api/catalog/bootstrap')
      const payload = await response.json()
      if (!response.ok) {
        toast({ title: 'Load failed', description: payload?.error ?? 'Unable to load catalog data.' })
        return
      }

      const categories = (payload.categories ?? []) as CatalogCategory[]
      const nextCategory = categories.find((item) => item.slug === categorySlug) ?? null
      setCategory(nextCategory)

      const allSubcategories = (payload.subcategories ?? []) as CatalogSubcategory[]
      const nextSubcategories = nextCategory
        ? allSubcategories.filter((item) => item.category_id === nextCategory.id)
        : []
      setSubcategories(nextSubcategories)

      const nextSubcategoryIds = new Set(nextSubcategories.map((item) => item.id))
      const allOptions = (payload.options ?? []) as CatalogOption[]
      setOptions(allOptions.filter((item) => nextSubcategoryIds.has(item.subcategory_id)))
    } finally {
      setLoading(false)
    }
  }

  if (!category) {
    return (
      <div className="p-8">
        <Link href="/dashboard/catalog" className="text-sm font-semibold text-primary hover:text-primary/80">Back to Catalog Setup</Link>
        <div className="mt-6 rounded-lg border border-border bg-white px-6 py-12 text-sm text-muted-foreground">This category could not be found.</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          <Link href="/dashboard/catalog" className="hover:text-foreground">Catalog Setup</Link> / Categories / {category.name}
        </div>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-jakarta text-3xl font-semibold text-foreground">{category.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage subcategories and options for this category in one place.</p>
          </div>
          <Link href="/dashboard/catalog" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
            Back to Categories
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-secondary/20 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-jakarta text-2xl font-semibold text-foreground">{category.name}</h2>
          <Badge className={category.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
            {category.status === 'active' ? 'Active' : 'Hidden'}
          </Badge>
          {category.is_system_locked ? (
            <Badge className="bg-amber-100 text-amber-700">System Locked</Badge>
          ) : null}
          <Badge className={category.show_in_nav === false || !category.nav_type ? 'bg-slate-100 text-slate-700' : category.nav_type === 'mega_menu' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
            {category.show_in_nav === false || !category.nav_type ? 'Not in Nav' : category.nav_type === 'mega_menu' ? 'Mega Menu' : 'Direct Link'}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div>
            <div className="font-semibold text-foreground">Slug</div>
            <div>{category.slug}</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Subcategories</div>
            <div>{subcategories.length}</div>
          </div>
          <div>
            <div className="font-semibold text-foreground">Options</div>
            <div>{options.length}</div>
          </div>
        </div>
        {category.is_system_locked ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This main category is protected, but you can still create and manage its subcategories and options below.
          </p>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CatalogDetailTab)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        <TabsContent value="subcategories" className="mt-6">
          <CategorySubcategoriesPanel category={category} subcategories={subcategories} onChange={loadData} />
        </TabsContent>

        <TabsContent value="options" className="mt-6">
          <CategoryOptionsPanel category={category} subcategories={subcategories} options={options} onChange={loadData} />
        </TabsContent>
      </Tabs>

      {loading ? (
        <div className="mt-8 text-sm text-muted-foreground">Updating category details...</div>
      ) : null}
    </div>
  )
}

function CategorySubcategoriesPanel({
  category,
  subcategories,
  onChange,
}: {
  category: CatalogCategory
  subcategories: CatalogSubcategory[]
  onChange: () => Promise<void>
}) {
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [formData, setFormData] = useState<SubcategoryFormState>(emptySubcategoryForm(category.id, subcategories.length + 1))
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CatalogSubcategory | null>(null)
  const [uploading, setUploading] = useState(false)

  const openNew = () => {
    setSelectedId(null)
    setFormData(emptySubcategoryForm(category.id, subcategories.length + 1))
    setIsPanelOpen(true)
  }

  const openEdit = (item: CatalogSubcategory) => {
    setSelectedId(item.id)
    setFormData({
      name: item.name,
      slug: item.slug,
      parentCategoryId: item.category_id,
      iconSvgPath: item.icon_svg_path ?? '',
      displayOrder: item.display_order,
      status: item.status === 'hidden' ? 'Hidden' : 'Active',
    })
    setIsPanelOpen(true)
  }

  const saveItem = async () => {
    const response = await authedFetch(selectedId ? `/api/catalog/subcategories/${selectedId}` : '/api/catalog/subcategories', {
      method: selectedId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        category_id: category.id,
        name: formData.name,
        slug: formData.slug,
        sub_type: 'standard',
        icon_svg_path: formData.iconSvgPath || null,
        display_order: formData.displayOrder,
        status: formData.status === 'Hidden' ? 'hidden' : 'active',
      }),
    })

    if (response.ok) {
      await onChange()
      setIsPanelOpen(false)
      setSelectedId(null)
      setSaveConfirmOpen(false)
      toast({ title: 'Subcategory saved', description: `${formData.name} was updated successfully.` })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save subcategory.' })
    }
  }

  const deleteItem = async (id: string) => {
    const response = await authedFetch(`/api/catalog/subcategories/${id}`, { method: 'DELETE' })
    if (response.ok) {
      await onChange()
      setDeleteTarget(null)
      toast({ title: 'Subcategory deleted', description: 'The subcategory was removed successfully.' })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Delete failed', description: payload?.error ?? 'Unable to delete subcategory.' })
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const path = await uploadCatalogSvg('subcategories', file)
      setFormData((current) => ({ ...current, iconSvgPath: path }))
      toast({ title: 'SVG uploaded', description: 'Subcategory icon uploaded successfully.' })
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Unable to upload SVG.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Subcategories" description={`Manage the subcategories linked to ${category.name}.`} actionLabel="Add New Subcategory" onAction={openNew} />

      <DataTable
        headers={['Name', 'Slug', 'Icon', 'Display Order', 'Status', 'Edit', 'Delete']}
        rows={subcategories.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.slug,
            item.icon_svg_path || 'No SVG',
            item.display_order,
            item.status === 'active' ? 'Active' : 'Hidden',
            <IconButton key="edit" onClick={() => openEdit(item)}><Edit2 size={14} className="text-muted-foreground" /></IconButton>,
            <IconButton key="delete" onClick={() => setDeleteTarget(item)} destructive><Trash2 size={14} className="text-red-600" /></IconButton>,
          ],
        }))}
      />

      <FormDialog
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        title={selectedId ? 'Edit Subcategory' : 'Add Subcategory'}
        description={`Manage subcategories for ${category.name}.`}
      >
        <Field label="Parent Category">
          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-2.5 text-sm text-foreground">{category.name}</div>
        </Field>
        <Field label="Name">
          <input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value, slug: prev.slug === '' || prev.slug === slugify(prev.name) ? slugify(e.target.value) : prev.slug }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        <Field label="Slug">
          <input value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Icon SVG">
          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              Upload SVG
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleUpload(file)
                }}
              />
            </label>
            {formData.iconSvgPath ? (
              <button
                type="button"
                onClick={() => setFormData((current) => ({ ...current, iconSvgPath: '' }))}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Remove SVG
              </button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {uploading ? 'Uploading SVG...' : formData.iconSvgPath || 'No SVG uploaded yet'}
            </p>
          </div>
        </Field>
        <Field label="Display Order">
          <input type="number" value={formData.displayOrder} onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Status">
          <ToggleRow options={['Active', 'Hidden']} value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value as SubcategoryFormState['status'] }))} />
        </Field>
        <Actions onSave={() => setSaveConfirmOpen(true)} onCancel={() => setIsPanelOpen(false)} />
      </FormDialog>

      <ConfirmDialog isOpen={saveConfirmOpen} title={selectedId ? 'Update subcategory?' : 'Create subcategory?'} description="This will save the subcategory changes." confirmText="Save" onConfirm={() => void saveItem()} onCancel={() => setSaveConfirmOpen(false)} />
      <ConfirmDialog isOpen={Boolean(deleteTarget)} title="Delete subcategory?" description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`} confirmText="Delete" type="delete" onConfirm={() => { if (!deleteTarget) return; void deleteItem(deleteTarget.id) }} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

function CategoryOptionsPanel({
  category,
  subcategories,
  options,
  onChange,
}: {
  category: CatalogCategory
  subcategories: CatalogSubcategory[]
  options: CatalogOption[]
  onChange: () => Promise<void>
}) {
  const { toast } = useToast()
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState<'all' | string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [formData, setFormData] = useState<OptionFormState>(emptyOptionForm(subcategories[0]?.id ?? '', options.length + 1))
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CatalogOption | null>(null)
  const [uploading, setUploading] = useState(false)

  const filteredOptions = useMemo(
    () => selectedSubcategoryFilter === 'all' ? options : options.filter((item) => item.subcategory_id === selectedSubcategoryFilter),
    [options, selectedSubcategoryFilter]
  )

  const openNew = () => {
    setSelectedId(null)
    setFormData(emptyOptionForm(subcategories[0]?.id ?? '', options.length + 1))
    setIsPanelOpen(true)
  }

  const openEdit = (item: CatalogOption) => {
    setSelectedId(item.id)
    setFormData({
      name: item.name,
      slug: item.slug,
      parentSubcategoryId: item.subcategory_id,
      iconSvgPath: item.icon_svg_path ?? '',
      displayOrder: item.display_order,
      status: item.status === 'hidden' ? 'Hidden' : 'Active',
    })
    setIsPanelOpen(true)
  }

  const saveItem = async () => {
    if (!formData.parentSubcategoryId) {
      toast({ title: 'Parent subcategory required', description: 'Choose which subcategory this option belongs to.' })
      return
    }

    const response = await authedFetch(selectedId ? `/api/catalog/options/${selectedId}` : '/api/catalog/options', {
      method: selectedId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        subcategory_id: formData.parentSubcategoryId,
        name: formData.name,
        slug: formData.slug,
        icon_svg_path: formData.iconSvgPath || null,
        display_order: formData.displayOrder,
        status: formData.status === 'Hidden' ? 'hidden' : 'active',
      }),
    })

    if (response.ok) {
      await onChange()
      setIsPanelOpen(false)
      setSelectedId(null)
      setSaveConfirmOpen(false)
      toast({ title: 'Option saved', description: `${formData.name} was updated successfully.` })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save option.' })
    }
  }

  const deleteItem = async (id: string) => {
    const response = await authedFetch(`/api/catalog/options/${id}`, { method: 'DELETE' })
    if (response.ok) {
      await onChange()
      setDeleteTarget(null)
      toast({ title: 'Option deleted', description: 'The option was removed successfully.' })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Delete failed', description: payload?.error ?? 'Unable to delete option.' })
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const path = await uploadCatalogSvg('options', file)
      setFormData((current) => ({ ...current, iconSvgPath: path }))
      toast({ title: 'SVG uploaded', description: 'Option icon uploaded successfully.' })
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Unable to upload SVG.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Options" description={`Manage options linked under the subcategories of ${category.name}.`} actionLabel="Add New Option" onAction={openNew} />

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Filter by subcategory</span>
        <Select value={selectedSubcategoryFilter} onValueChange={setSelectedSubcategoryFilter}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="All subcategories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subcategories</SelectItem>
            {subcategories.map((subcategory) => (
              <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        headers={['Name', 'Slug', 'Icon', 'Parent Subcategory', 'Display Order', 'Status', 'Edit', 'Delete']}
        rows={filteredOptions.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.slug,
            item.icon_svg_path || 'No SVG',
            subcategories.find((subcategory) => subcategory.id === item.subcategory_id)?.name ?? '',
            item.display_order,
            item.status === 'active' ? 'Active' : 'Hidden',
            <IconButton key="edit" onClick={() => openEdit(item)}><Edit2 size={14} className="text-muted-foreground" /></IconButton>,
            <IconButton key="delete" onClick={() => setDeleteTarget(item)} destructive><Trash2 size={14} className="text-red-600" /></IconButton>,
          ],
        }))}
      />

      <FormDialog
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        title={selectedId ? 'Edit Option' : 'Add Option'}
        description={`Manage options under ${category.name}.`}
      >
        <Field label="Name">
          <input
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value, slug: prev.slug === '' || prev.slug === slugify(prev.name) ? slugify(e.target.value) : prev.slug }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        <Field label="Slug">
          <input value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Icon SVG">
          <div className="space-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              Upload SVG
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleUpload(file)
                }}
              />
            </label>
            {formData.iconSvgPath ? (
              <button
                type="button"
                onClick={() => setFormData((current) => ({ ...current, iconSvgPath: '' }))}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Remove SVG
              </button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {uploading ? 'Uploading SVG...' : formData.iconSvgPath || 'No SVG uploaded yet'}
            </p>
          </div>
        </Field>
        <Field label="Parent Subcategory">
          <Select value={formData.parentSubcategoryId || undefined} onValueChange={(value) => setFormData((prev) => ({ ...prev, parentSubcategoryId: value }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((subcategory) => (
                <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Display Order">
          <input type="number" value={formData.displayOrder} onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Status">
          <ToggleRow options={['Active', 'Hidden']} value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value as OptionFormState['status'] }))} />
        </Field>
        <Actions onSave={() => setSaveConfirmOpen(true)} onCancel={() => setIsPanelOpen(false)} />
      </FormDialog>

      <ConfirmDialog isOpen={saveConfirmOpen} title={selectedId ? 'Update option?' : 'Create option?'} description="This will save the option changes." confirmText="Save" onConfirm={() => void saveItem()} onCancel={() => setSaveConfirmOpen(false)} />
      <ConfirmDialog isOpen={Boolean(deleteTarget)} title="Delete option?" description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`} confirmText="Delete" type="delete" onConfirm={() => { if (!deleteTarget) return; void deleteItem(deleteTarget.id) }} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

function SectionHeader({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-jakarta text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <button type="button" onClick={onAction} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
        <Plus size={16} />
        {actionLabel}
      </button>
    </div>
  )
}

function FormDialog({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string
  description: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-jakarta text-lg font-semibold text-foreground">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function ToggleRow({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${value === option ? 'bg-primary text-white' : 'border border-border text-foreground hover:bg-secondary'}`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function Actions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">Save</button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button>
    </div>
  )
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>
}

function IconButton({ children, onClick, destructive = false }: { children: ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded p-1.5 transition-colors ${destructive ? 'hover:bg-red-100' : 'hover:bg-secondary'}`}>
      {children}
    </button>
  )
}

function DataTable({ headers, rows }: { headers: string[]; rows: { id: string; cells: ReactNode[] }[] }) {
  const [page, setPage] = useState(1)
  const totalItems = rows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [rows])

  return (
    <div className="rounded-lg border border-border bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {headers.map((header) => (
                <th key={header} className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? visibleRows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`} className="px-6 py-4 text-sm text-foreground">{cell}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-10 text-center text-sm text-muted-foreground">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination page={currentPage} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  )
}
