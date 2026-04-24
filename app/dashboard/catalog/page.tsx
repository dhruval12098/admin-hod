'use client'

import Link from 'next/link'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { CatalogCategory, CatalogOption, CatalogSubcategory, ProductContentRule } from '@/lib/product-catalog'
import { slugify } from '@/lib/product-catalog'

type CatalogTab = 'categories' | 'policies'

type CategoryFormState = {
  name: string
  slug: string
  showInNav: boolean
  navType: 'Mega Menu' | 'Direct Link'
  directUrl: string
  displayOrder: number
  status: 'Active' | 'Hidden'
}

type SubcategoryFormState = {
  name: string
  slug: string
  parentCategoryId: string
  displayOrder: number
  status: 'Active' | 'Hidden'
}

type OptionFormState = {
  name: string
  slug: string
  parentSubcategoryId: string
  displayOrder: number
  status: 'Active' | 'Hidden'
}

type PolicyFormState = {
  kind: 'shipping' | 'care_warranty'
  name: string
  slug: string
  title: string
  body: string
  displayOrder: number
  status: 'Active' | 'Hidden'
}

function emptyCategoryForm(nextOrder: number): CategoryFormState {
  return {
    name: '',
    slug: '',
    showInNav: true,
    navType: 'Mega Menu',
    directUrl: '',
    displayOrder: nextOrder,
    status: 'Active',
  }
}

function emptySubcategoryForm(categoryId: string, nextOrder: number): SubcategoryFormState {
  return {
    name: '',
    slug: '',
    parentCategoryId: categoryId || '',
    displayOrder: nextOrder,
    status: 'Active',
  }
}

function emptyOptionForm(subcategoryId: string, nextOrder: number): OptionFormState {
  return {
    name: '',
    slug: '',
    parentSubcategoryId: subcategoryId || '',
    displayOrder: nextOrder,
    status: 'Active',
  }
}

function emptyPolicyForm(nextOrder: number): PolicyFormState {
  return {
    kind: 'shipping',
    name: '',
    slug: '',
    title: '',
    body: '',
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

export default function CatalogSetupPage() {
  const [activeTab, setActiveTab] = useState<CatalogTab>('categories')
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [productContentRules, setProductContentRules] = useState<ProductContentRule[]>([])

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'categories' || hash === 'policies') {
        setActiveTab(hash)
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await authedFetch('/api/catalog/bootstrap')
      const payload = await response.json()
      if (response.ok) {
        setCategories(payload.categories ?? [])
        setProductContentRules(payload.productContentRules ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Catalog Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure top-level catalog categories and reusable master policies.</p>
      </div>

      <div className="mb-8 flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'categories' as const, label: 'Categories' },
          { id: 'policies' as const, label: 'Policies' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id)
              window.location.hash = tab.id
            }}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-150 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-white px-6 py-12 text-sm text-muted-foreground">Loading catalog data...</div>
      ) : null}

      {!loading && activeTab === 'categories' ? (
        <CategoriesPanel categories={categories} onChange={loadData} />
      ) : null}

      {!loading && activeTab === 'policies' ? (
        <PoliciesPanel productContentRules={productContentRules} onChange={loadData} />
      ) : null}
    </div>
  )
}

function CategoriesPanel({ categories, onChange }: { categories: CatalogCategory[]; onChange: () => Promise<void> }) {
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [formData, setFormData] = useState<CategoryFormState>(emptyCategoryForm(categories.length + 1))
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CatalogCategory | null>(null)

  const openNew = () => {
    setSelectedId(null)
    setFormData(emptyCategoryForm(categories.length + 1))
    setIsPanelOpen(true)
  }

  const openEdit = (item: CatalogCategory) => {
    setSelectedId(item.id)
    setFormData({
      name: item.name,
      slug: item.slug,
      showInNav: item.show_in_nav ?? Boolean(item.nav_type),
      navType: item.nav_type === 'direct_link' ? 'Direct Link' : 'Mega Menu',
      directUrl: item.direct_link_url ?? '',
      displayOrder: item.display_order,
      status: item.status === 'hidden' ? 'Hidden' : 'Active',
    })
    setIsPanelOpen(true)
  }

  const saveItem = async () => {
    const response = await authedFetch(selectedId ? `/api/catalog/categories/${selectedId}` : '/api/catalog/categories', {
      method: selectedId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        code: formData.slug.replace(/-/g, '_'),
        name: formData.name,
        slug: formData.slug,
        show_in_nav: formData.showInNav,
        nav_type: formData.showInNav ? (formData.navType === 'Direct Link' ? 'direct_link' : 'mega_menu') : null,
        direct_link_url: formData.showInNav && formData.navType === 'Direct Link' ? formData.directUrl : null,
        display_order: formData.displayOrder,
        status: formData.status === 'Hidden' ? 'hidden' : 'active',
      }),
    })

    if (response.ok) {
      await onChange()
      setIsPanelOpen(false)
      setSelectedId(null)
      setSaveConfirmOpen(false)
      toast({ title: 'Category saved', description: `${formData.name} was updated successfully.` })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save category.' })
    }
  }

  const deleteItem = async (id: string) => {
    const response = await authedFetch(`/api/catalog/categories/${id}`, { method: 'DELETE' })
    if (response.ok) {
      await onChange()
      setDeleteTarget(null)
      toast({ title: 'Category deleted', description: 'The category was removed successfully.' })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Delete failed', description: payload?.error ?? 'Unable to delete category.' })
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Categories" description="Manage main catalog categories." actionLabel="Add New Category" onAction={openNew} />

      <DataTable
        headers={['Name', 'Slug', 'Nav Type', 'Display Order', 'Status', 'View', 'Edit', 'Delete']}
        rows={categories.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.slug,
            <Badge key="nav" className={item.show_in_nav === false || !item.nav_type ? 'bg-slate-100 text-slate-700' : item.nav_type === 'mega_menu' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
              {item.show_in_nav === false || !item.nav_type ? 'Not in Nav' : item.nav_type === 'mega_menu' ? 'Mega Menu' : 'Direct Link'}
            </Badge>,
            item.display_order,
            <Badge key="status" className={item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>{item.status === 'active' ? 'Active' : 'Hidden'}</Badge>,
            <Link
              key="view"
              href={`/dashboard/catalog/${item.slug}`}
              className="inline-flex items-center rounded p-1.5 transition-colors hover:bg-secondary"
            >
              <span className="text-sm font-medium text-muted-foreground">View</span>
            </Link>,
            <IconButton key="edit" onClick={() => openEdit(item)}><Edit2 size={14} className="text-muted-foreground" /></IconButton>,
            <IconButton key="delete" onClick={() => setDeleteTarget(item)} destructive><Trash2 size={14} className="text-red-600" /></IconButton>,
          ],
        }))}
      />

      <FormDialog
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        title={selectedId ? 'Edit Category' : 'Add Category'}
        description="Use this popup to add or edit category records."
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
        <Field label="Show in Navbar">
          <ToggleRow options={['Yes', 'No']} value={formData.showInNav ? 'Yes' : 'No'} onChange={(value) => setFormData((prev) => ({ ...prev, showInNav: value === 'Yes' }))} />
        </Field>
        {formData.showInNav ? (
          <Field label="Nav Type">
            <ToggleRow options={['Mega Menu', 'Direct Link']} value={formData.navType} onChange={(value) => setFormData((prev) => ({ ...prev, navType: value as CategoryFormState['navType'] }))} />
          </Field>
        ) : null}
        {formData.showInNav && formData.navType === 'Direct Link' ? (
          <Field label="Direct Link URL">
            <input value={formData.directUrl} onChange={(e) => setFormData((prev) => ({ ...prev, directUrl: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </Field>
        ) : null}
        <Field label="Display Order">
          <input type="number" value={formData.displayOrder} onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Status">
          <ToggleRow options={['Active', 'Hidden']} value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value as CategoryFormState['status'] }))} />
        </Field>
        <Actions onSave={() => setSaveConfirmOpen(true)} onCancel={() => setIsPanelOpen(false)} />
      </FormDialog>

      <ConfirmDialog
        isOpen={saveConfirmOpen}
        title={selectedId ? 'Update category?' : 'Create category?'}
        description="This will save the category changes."
        confirmText="Save"
        onConfirm={() => void saveItem()}
        onCancel={() => setSaveConfirmOpen(false)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete category?"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmText="Delete"
        type="delete"
        onConfirm={() => deleteTarget && void deleteItem(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function SubcategoriesPanel({
  categories,
  subcategories,
  onChange,
}: {
  categories: CatalogCategory[]
  subcategories: CatalogSubcategory[]
  onChange: () => Promise<void>
}) {
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [formData, setFormData] = useState<SubcategoryFormState>(emptySubcategoryForm(categories[0]?.id ?? '', subcategories.length + 1))
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CatalogSubcategory | null>(null)

  const openNew = () => {
    setSelectedId(null)
    setFormData(emptySubcategoryForm('', subcategories.length + 1))
    setIsPanelOpen(true)
  }

  const openEdit = (item: CatalogSubcategory) => {
    setSelectedId(item.id)
    setFormData({
      name: item.name,
      slug: item.slug,
      parentCategoryId: item.category_id,
      displayOrder: item.display_order,
      status: item.status === 'hidden' ? 'Hidden' : 'Active',
    })
    setIsPanelOpen(true)
  }

  const saveItem = async () => {
    if (!formData.parentCategoryId) {
      toast({ title: 'Parent category required', description: 'Choose which category this subcategory belongs to.' })
      return
    }

    const response = await authedFetch(selectedId ? `/api/catalog/subcategories/${selectedId}` : '/api/catalog/subcategories', {
      method: selectedId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        category_id: formData.parentCategoryId,
        name: formData.name,
        slug: formData.slug,
        sub_type: 'standard',
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

  return (
    <div className="space-y-6">
      <SectionHeader title="Subcategories" description="Manage category children and their display behavior." actionLabel="Add New Subcategory" onAction={openNew} />

      <DataTable
        headers={['Name', 'Slug', 'Parent Category', 'Display Order', 'Status', 'Edit', 'Delete']}
        rows={subcategories.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.slug,
            categories.find((category) => category.id === item.category_id)?.name ?? '',
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
        description="Use this popup to add or edit subcategory records."
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
        <Field label="Parent Category">
          <Select value={formData.parentCategoryId || undefined} onValueChange={(value) => setFormData((prev) => ({ ...prev, parentCategoryId: value }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Display Order">
          <input type="number" value={formData.displayOrder} onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Status">
          <ToggleRow options={['Active', 'Hidden']} value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value as SubcategoryFormState['status'] }))} />
        </Field>
        <p className="text-xs text-muted-foreground">Pick the parent category from the dropdown above before saving.</p>
        <Actions onSave={() => setSaveConfirmOpen(true)} onCancel={() => setIsPanelOpen(false)} />
      </FormDialog>

      <ConfirmDialog
        isOpen={saveConfirmOpen}
        title={selectedId ? 'Update subcategory?' : 'Create subcategory?'}
        description="This will save the subcategory changes."
        confirmText="Save"
        onConfirm={() => void saveItem()}
        onCancel={() => setSaveConfirmOpen(false)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete subcategory?"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmText="Delete"
        type="delete"
        onConfirm={() => deleteTarget && void deleteItem(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function OptionsPanel({
  subcategories,
  options,
  onChange,
}: {
  subcategories: CatalogSubcategory[]
  options: CatalogOption[]
  onChange: () => Promise<void>
}) {
  const { toast } = useToast()
  const availableSubcategories = useMemo(
    () => subcategories.filter((item) => item.status === 'active'),
    [subcategories]
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [formData, setFormData] = useState<OptionFormState>(emptyOptionForm(availableSubcategories[0]?.id ?? '', options.length + 1))
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CatalogOption | null>(null)

  const openNew = () => {
    setSelectedId(null)
    setFormData(emptyOptionForm('', options.length + 1))
    setIsPanelOpen(true)
  }

  const openEdit = (item: CatalogOption) => {
    setSelectedId(item.id)
    setFormData({
      name: item.name,
      slug: item.slug,
      parentSubcategoryId: item.subcategory_id,
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

  return (
    <div className="space-y-6">
      <SectionHeader title="Options" description="Manage manual child options for any subcategory." actionLabel="Add New Option" onAction={openNew} />

      <DataTable
        headers={['Name', 'Slug', 'Parent Subcategory', 'Display Order', 'Status', 'Edit', 'Delete']}
        rows={options.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.slug,
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
        description="Use this popup to add or edit option records."
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
        <Field label="Parent Subcategory">
          <Select value={formData.parentSubcategoryId || undefined} onValueChange={(value) => setFormData((prev) => ({ ...prev, parentSubcategoryId: value }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {availableSubcategories.map((subcategory) => (
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
        <p className="text-xs text-muted-foreground">Pick the parent subcategory from the dropdown above before saving.</p>
        <Actions onSave={() => setSaveConfirmOpen(true)} onCancel={() => setIsPanelOpen(false)} />
      </FormDialog>

      <ConfirmDialog
        isOpen={saveConfirmOpen}
        title={selectedId ? 'Update option?' : 'Create option?'}
        description="This will save the option changes."
        confirmText="Save"
        onConfirm={() => void saveItem()}
        onCancel={() => setSaveConfirmOpen(false)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete option?"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmText="Delete"
        type="delete"
        onConfirm={() => deleteTarget && void deleteItem(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function PoliciesPanel({
  productContentRules,
  onChange,
}: {
  productContentRules: ProductContentRule[]
  onChange: () => Promise<void>
}) {
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [formData, setFormData] = useState<PolicyFormState>(emptyPolicyForm(productContentRules.length + 1))
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProductContentRule | null>(null)

  const openNew = () => {
    setSelectedId(null)
    setFormData(emptyPolicyForm(productContentRules.length + 1))
    setIsPanelOpen(true)
  }

  const openEdit = (item: ProductContentRule) => {
    setSelectedId(item.id)
    setFormData({
      kind: item.kind,
      name: item.name,
      slug: item.slug,
      title: item.title,
      body: item.body,
      displayOrder: item.display_order ?? 0,
      status: item.status === 'hidden' ? 'Hidden' : 'Active',
    })
    setIsPanelOpen(true)
  }

  const saveItem = async () => {
    const response = await authedFetch(
      selectedId ? `/api/catalog/product-content-rules/${selectedId}` : '/api/catalog/product-content-rules',
      {
        method: selectedId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          kind: formData.kind,
          name: formData.name,
          slug: formData.slug,
          title: formData.title,
          body: formData.body,
          display_order: formData.displayOrder,
          status: formData.status === 'Hidden' ? 'hidden' : 'active',
        }),
      }
    )

    if (response.ok) {
      await onChange()
      setIsPanelOpen(false)
      setSelectedId(null)
      setSaveConfirmOpen(false)
      toast({ title: 'Policy saved', description: `${formData.name} was updated successfully.` })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save policy.' })
    }
  }

  const deleteItem = async (id: string) => {
    const response = await authedFetch(`/api/catalog/product-content-rules/${id}`, { method: 'DELETE' })
    if (response.ok) {
      await onChange()
      setDeleteTarget(null)
      toast({ title: 'Policy deleted', description: 'The policy was removed successfully.' })
    } else {
      const payload = await response.json().catch(() => null)
      toast({ title: 'Delete failed', description: payload?.error ?? 'Unable to delete policy.' })
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Policies"
        description="Manage reusable Shipping and Care & Warranty master rules."
        actionLabel="Add New Policy"
        onAction={openNew}
      />

      <DataTable
        headers={['Name', 'Kind', 'Title', 'Display Order', 'Status', 'Edit', 'Delete']}
        rows={productContentRules.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.kind === 'shipping' ? 'Shipping' : 'Care & Warranty',
            item.title,
            item.display_order ?? 0,
            item.status === 'active' ? 'Active' : 'Hidden',
            <IconButton key="edit" onClick={() => openEdit(item)}><Edit2 size={14} className="text-muted-foreground" /></IconButton>,
            <IconButton key="delete" onClick={() => setDeleteTarget(item)} destructive><Trash2 size={14} className="text-red-600" /></IconButton>,
          ],
        }))}
      />

      <FormDialog
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        title={selectedId ? 'Edit Policy' : 'Add Policy'}
        description="Create reusable Shipping and Care & Warranty master rules."
      >
        <Field label="Policy Type">
          <ToggleRow
            options={['Shipping', 'Care & Warranty']}
            value={formData.kind === 'shipping' ? 'Shipping' : 'Care & Warranty'}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                kind: value === 'Shipping' ? 'shipping' : 'care_warranty',
              }))
            }
          />
        </Field>
        <Field label="Name">
          <input
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                name: e.target.value,
                slug: prev.slug === '' || prev.slug === slugify(prev.name) ? slugify(e.target.value) : prev.slug,
              }))
            }
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        <Field label="Slug">
          <input value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Display Title">
          <input
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        <Field label="Body">
          <textarea
            value={formData.body}
            onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
            rows={6}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </Field>
        <Field label="Display Order">
          <input type="number" value={formData.displayOrder} onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </Field>
        <Field label="Status">
          <ToggleRow options={['Active', 'Hidden']} value={formData.status} onChange={(value) => setFormData((prev) => ({ ...prev, status: value as PolicyFormState['status'] }))} />
        </Field>
        <Actions onSave={() => setSaveConfirmOpen(true)} onCancel={() => setIsPanelOpen(false)} />
      </FormDialog>

      <ConfirmDialog
        isOpen={saveConfirmOpen}
        title={selectedId ? 'Update policy?' : 'Create policy?'}
        description="This will save the policy changes."
        confirmText="Save"
        onConfirm={() => void saveItem()}
        onCancel={() => setSaveConfirmOpen(false)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete policy?"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmText="Delete"
        type="delete"
        onConfirm={() => deleteTarget && void deleteItem(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
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
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`} className="px-6 py-3.5 text-sm text-foreground">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
