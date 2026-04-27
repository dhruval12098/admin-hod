'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Edit2, Eye, Plus, Trash2, Upload, Video } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TablePagination } from '@/components/table-pagination'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { slugify } from '@/lib/product-catalog'

export type BespokeTab = 'hero' | 'portfolio-categories' | 'portfolio-items' | 'form' | 'submissions'

export type BespokeHero = {
  id?: string
  badge_text?: string | null
  eyebrow?: string | null
  heading_line_1: string
  heading_line_2?: string | null
  subtitle?: string | null
  primary_cta_label?: string | null
  primary_cta_action?: string | null
  secondary_cta_label?: string | null
  secondary_cta_action?: string | null
  slider_enabled?: boolean
  status?: 'active' | 'hidden'
  items?: Array<{
    id?: number
    clientId?: string
    sort_order: number
    image_path: string
    mobile_image_path?: string
    button_text: string
    button_link: string
  }>
}

export type PortfolioCategory = {
  id: string
  name: string
  slug: string
  display_order: number
  status: 'active' | 'hidden'
}

export type PortfolioItem = {
  id: string
  title: string
  tag: string
  category_id: string
  media_type: 'image' | 'video'
  media_path?: string | null
  thumbnail_path?: string | null
  gem_style?: string | null
  gem_color?: string | null
  dark_theme: boolean
  short_description?: string | null
  display_order: number
  status: 'active' | 'hidden'
}

export type SimpleRow = {
  id?: string
  label: string
  display_order: number
  status: 'active' | 'hidden'
}

export type FormConfig = {
  settings?: {
    intro_heading?: string | null
    intro_subtitle?: string | null
    footer_note?: string | null
    status?: 'active' | 'hidden'
  } | null
  guarantees: SimpleRow[]
  pieceTypes: SimpleRow[]
  stoneOptions: SimpleRow[]
  caratOptions: SimpleRow[]
  metalOptions: SimpleRow[]
}

export type BespokeSubmission = {
  id: string
  full_name: string
  email: string
  phone?: string | null
  country: string
  piece_type: string
  stone_preference?: string | null
  approx_carat?: string | null
  preferred_metal?: string | null
  message: string
  status: string
  created_at: string
}

export type BespokePageData = {
  hero: BespokeHero
  categories: PortfolioCategory[]
  items: PortfolioItem[]
  formConfig: FormConfig
  submissions: BespokeSubmission[]
}

const PAGE_SIZE = 20

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

function emptyPortfolioCategory(nextOrder: number): PortfolioCategory {
  return {
    id: '',
    name: '',
    slug: '',
    display_order: nextOrder,
    status: 'active',
  }
}

function emptyPortfolioItem(categoryId: string, nextOrder: number): PortfolioItem {
  return {
    id: '',
    title: '',
    tag: '',
    category_id: categoryId,
    media_type: 'image',
    media_path: '',
    thumbnail_path: '',
    gem_style: 'round',
    gem_color: '#20304A',
    dark_theme: false,
    short_description: '',
    display_order: nextOrder,
    status: 'active',
  }
}

function emptySimpleRow(nextOrder: number): SimpleRow {
  return { id: '', label: '', display_order: nextOrder, status: 'active' }
}

export function BespokeClient({ initialData }: { initialData: BespokePageData }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<BespokeTab>('hero')
  const [loading, setLoading] = useState(false)
  const [hero, setHero] = useState<BespokeHero>(initialData.hero)
  const [categories, setCategories] = useState<PortfolioCategory[]>(initialData.categories)
  const [items, setItems] = useState<PortfolioItem[]>(initialData.items)
  const [formConfig, setFormConfig] = useState<FormConfig>(initialData.formConfig)
  const [submissions, setSubmissions] = useState<BespokeSubmission[]>(initialData.submissions)

  const loadData = async () => {
    setLoading(true)
    try {
      const [submissionsRes, heroRes, categoryRes, itemRes, formRes] = await Promise.all([
        authedFetch('/api/bespoke/submissions'),
        authedFetch('/api/bespoke/hero'),
        authedFetch('/api/bespoke/portfolio-categories'),
        authedFetch('/api/bespoke/portfolio-items'),
        authedFetch('/api/bespoke/form-config'),
      ])

      const [submissionsPayload, heroPayload, categoryPayload, itemPayload, formPayload] = await Promise.all([
        submissionsRes.json().catch(() => null),
        heroRes.json().catch(() => null),
        categoryRes.json().catch(() => null),
        itemRes.json().catch(() => null),
        formRes.json().catch(() => null),
      ])

      if (submissionsRes.ok) setSubmissions(submissionsPayload?.items ?? [])
      if (heroRes.ok && heroPayload?.item) setHero({ ...heroPayload.item, items: heroPayload.items ?? [] })
      if (categoryRes.ok) setCategories(categoryPayload?.items ?? [])
      if (itemRes.ok) setItems(itemPayload?.items ?? [])
      if (formRes.ok && formPayload) {
        setFormConfig({
          settings: formPayload.settings ?? { intro_heading: '', intro_subtitle: '', footer_note: '', status: 'active' },
          guarantees: formPayload.guarantees ?? [],
          pieceTypes: formPayload.pieceTypes ?? [],
          stoneOptions: formPayload.stoneOptions ?? [],
          caratOptions: formPayload.caratOptions ?? [],
          metalOptions: formPayload.metalOptions ?? [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Bespoke</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage Bespoke hero, portfolio filters/items, and enquiry form settings.</p>
      </div>

      <div className="mb-8 flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'hero' as const, label: 'Hero' },
          { id: 'portfolio-categories' as const, label: 'Portfolio Categories' },
          { id: 'portfolio-items' as const, label: 'Portfolio Items' },
          { id: 'form' as const, label: 'Form Settings' },
          { id: 'submissions' as const, label: 'Submissions' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-150 ${
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <div className="rounded-lg border border-border bg-white px-6 py-12 text-sm text-muted-foreground">Updating bespoke data...</div> : null}

      {!loading && activeTab === 'hero' ? <HeroPanel hero={hero} setHero={setHero} onReload={loadData} /> : null}
      {!loading && activeTab === 'portfolio-categories' ? <PortfolioCategoriesPanel categories={categories} onReload={loadData} /> : null}
      {!loading && activeTab === 'portfolio-items' ? <PortfolioItemsPanel categories={categories} items={items} onReload={loadData} /> : null}
      {!loading && activeTab === 'form' ? <FormPanel formConfig={formConfig} setFormConfig={setFormConfig} onReload={loadData} /> : null}
      {!loading && activeTab === 'submissions' ? <SubmissionSummaryPanel submissions={submissions} /> : null}
    </div>
  )
}

function SubmissionSummaryPanel({ submissions }: { submissions: BespokeSubmission[] }) {
  return (
    <section className="rounded-lg border border-border bg-white p-6 shadow-xs space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-jakarta text-lg font-semibold text-foreground">Submitted Enquiries</h2>
          <p className="mt-1 text-sm text-muted-foreground">All bespoke form submissions captured from the storefront.</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Open any submission directly, or use the submissions page for filtering.</p>
      <DataTable
        headers={['Name', 'Email', 'Piece', 'Country', 'Date', 'View']}
        rows={submissions.slice(0, 5).map((item) => ({
          id: item.id,
          cells: [
            <div key="name">
              <div className="font-medium text-foreground">{item.full_name}</div>
              <div className="text-xs text-muted-foreground">{item.phone || 'No phone'}</div>
            </div>,
            item.email,
            item.piece_type,
            item.country,
            <div key="date">
              <div>{new Date(item.created_at).toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleTimeString()}</div>
            </div>,
            <Link
              key="view"
              href={`/dashboard/bespoke/submissions/${item.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <Eye size={14} />
              View
            </Link>,
          ],
        }))}
      />
      {submissions.length > 5 ? <p className="text-xs text-muted-foreground">Showing the latest 5 submissions here.</p> : null}
      {submissions.length === 0 ? <p className="text-sm text-muted-foreground">No bespoke enquiries received yet.</p> : null}
    </section>
  )
}

function HeroPanel({ hero, setHero, onReload }: { hero: BespokeHero; setHero: (value: BespokeHero) => void; onReload: () => Promise<void> }) {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading'>('idle')
  const [editorItem, setEditorItem] = useState<NonNullable<BespokeHero['items']>[number]>({
    clientId: 'draft',
    sort_order: 1,
    image_path: '',
    mobile_image_path: '',
    button_text: '',
    button_link: '',
  })
  const nextSortOrder = Math.max(...(hero.items ?? []).map((item) => item.sort_order), 0) + 1
  const sortedSlides = [...(hero.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  const uploadImage = async (file: File) => {
    setUploadState('uploading')
    const body = new FormData()
    body.append('file', file)
    const response = await authedFetch('/api/cms/uploads/bespoke-hero', { method: 'POST', body })
    const payload = await response.json().catch(() => null)
    setUploadState('idle')
    if (!response.ok || !payload?.path) throw new Error(payload?.error ?? 'Unable to upload image.')
    return payload.path as string
  }

  const openNewSlide = () => {
    setEditorItem({
      clientId: `draft-${Date.now()}`,
      sort_order: nextSortOrder,
      image_path: '',
      mobile_image_path: '',
      button_text: '',
      button_link: '',
    })
    setUploadState('idle')
    setEditorOpen(true)
  }

  const openEditSlide = (item: NonNullable<BespokeHero['items']>[number]) => {
    setEditorItem({ ...item })
    setUploadState('idle')
    setEditorOpen(true)
  }

  const saveEditor = () => {
    if (!editorItem.image_path || !editorItem.button_text || !editorItem.button_link) {
      toast({ title: 'Missing slide details', description: 'Desktop image, button text, and button link are required.', variant: 'destructive' })
      return
    }

    const existingIndex = (hero.items ?? []).findIndex((item) => (item.id && editorItem.id ? item.id === editorItem.id : item.clientId === editorItem.clientId))
    const nextItems = [...(hero.items ?? [])]

    if (existingIndex >= 0) {
      nextItems[existingIndex] = editorItem
    } else {
      nextItems.push(editorItem)
    }

    setHero({ ...hero, items: nextItems })
    setEditorOpen(false)
    toast({ title: 'Slide added', description: 'Hero slide saved successfully.' })
  }

  const save = async () => {
    const response = await authedFetch('/api/bespoke/hero', {
      method: 'PUT',
      body: JSON.stringify(hero),
    })
    const payload = await response.json().catch(() => null)
    if (response.ok) {
      setConfirmOpen(false)
      await onReload()
      toast({ title: 'Hero saved', description: 'Bespoke hero content was updated.' })
    } else {
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save hero.', variant: 'destructive' })
    }
  }

  return (
    <div className="rounded-lg border border-border bg-white p-6 shadow-xs space-y-5">
      <Field label="Badge Text"><input value={hero.badge_text ?? ''} onChange={(e) => setHero({ ...hero, badge_text: e.target.value })} className={inputClassName} /></Field>
      <Field label="Eyebrow"><input value={hero.eyebrow ?? ''} onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })} className={inputClassName} /></Field>
      <Field label="Heading Line 1"><input value={hero.heading_line_1 ?? ''} onChange={(e) => setHero({ ...hero, heading_line_1: e.target.value })} className={inputClassName} /></Field>
      <Field label="Heading Line 2"><input value={hero.heading_line_2 ?? ''} onChange={(e) => setHero({ ...hero, heading_line_2: e.target.value })} className={inputClassName} /></Field>
      <Field label="Subtitle"><textarea value={hero.subtitle ?? ''} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} rows={5} className={inputClassName} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Primary CTA Label"><input value={hero.primary_cta_label ?? ''} onChange={(e) => setHero({ ...hero, primary_cta_label: e.target.value })} className={inputClassName} /></Field>
        <Field label="Primary CTA Action"><input value={hero.primary_cta_action ?? ''} onChange={(e) => setHero({ ...hero, primary_cta_action: e.target.value })} className={inputClassName} /></Field>
        <Field label="Secondary CTA Label"><input value={hero.secondary_cta_label ?? ''} onChange={(e) => setHero({ ...hero, secondary_cta_label: e.target.value })} className={inputClassName} /></Field>
        <Field label="Secondary CTA Action"><input value={hero.secondary_cta_action ?? ''} onChange={(e) => setHero({ ...hero, secondary_cta_action: e.target.value })} className={inputClassName} /></Field>
      </div>
      <Field label="Hero Mode"><ToggleRow options={['Text', 'Image Slider']} value={hero.slider_enabled ? 'Image Slider' : 'Text'} onChange={(value) => setHero({ ...hero, slider_enabled: value === 'Image Slider' })} /></Field>
      <Field label="Status"><ToggleRow options={['Active', 'Hidden']} value={hero.status === 'hidden' ? 'Hidden' : 'Active'} onChange={(value) => setHero({ ...hero, status: value === 'Hidden' ? 'hidden' : 'active' })} /></Field>
      {hero.slider_enabled ? (
        <section className="mt-4 max-w-5xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Hero Slides</h3>
              <p className="text-sm text-muted-foreground">Each slide needs an image, optional mobile image, button text, and destination link.</p>
            </div>
            <button type="button" onClick={openNewSlide} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
              <Plus size={16} />
              Add Slide
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Desktop Image</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Mobile Image</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Button Text</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Link</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSlides.map((item) => (
                  <tr key={item.id ?? item.clientId} className="border-b border-border last:border-b-0">
                    <td className="px-5 py-4 text-sm">{item.sort_order}</td>
                    <td className="px-5 py-4 text-sm">{item.image_path}</td>
                    <td className="px-5 py-4 text-sm">{item.mobile_image_path || '-'}</td>
                    <td className="px-5 py-4 text-sm">{item.button_text}</td>
                    <td className="px-5 py-4 text-sm">{item.button_link}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditSlide(item)}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedSlides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No slides added yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="flex justify-end"><button type="button" onClick={() => setConfirmOpen(true)} className={primaryButtonClassName}>Save Hero</button></div>
      <ConfirmDialog isOpen={confirmOpen} title="Save hero changes?" description="This will update the live Bespoke hero section." confirmText="Save" onConfirm={() => void save()} onCancel={() => setConfirmOpen(false)} />
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Hero Slide</DialogTitle>
            <DialogDescription>Upload a desktop image and define the CTA details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Order"><input type="number" value={editorItem.sort_order} onChange={(e) => setEditorItem((prev) => ({ ...prev, sort_order: Number(e.target.value) }))} className={inputClassName} /></Field>
            <Field label="Desktop Image">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/30">
                <Upload size={16} />
                <span>{uploadState === 'uploading' ? 'Uploading...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const path = await uploadImage(file)
                      setEditorItem((prev) => ({ ...prev, image_path: path }))
                      toast({ title: 'Uploaded', description: 'Hero image uploaded successfully.' })
                    } catch (error) {
                      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Unable to upload image.', variant: 'destructive' })
                    }
                  }}
                />
              </label>
              {editorItem.image_path ? <p className="mt-2 text-xs text-muted-foreground">{editorItem.image_path}</p> : null}
            </Field>
            <Field label="Mobile Image Path"><input value={editorItem.mobile_image_path ?? ''} onChange={(e) => setEditorItem((prev) => ({ ...prev, mobile_image_path: e.target.value }))} className={inputClassName} /></Field>
            <Field label="Button Text"><input value={editorItem.button_text} onChange={(e) => setEditorItem((prev) => ({ ...prev, button_text: e.target.value }))} className={inputClassName} /></Field>
            <Field label="Button Link"><input value={editorItem.button_link} onChange={(e) => setEditorItem((prev) => ({ ...prev, button_link: e.target.value }))} className={inputClassName} /></Field>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button>
            <button type="button" onClick={saveEditor} className={primaryButtonClassName}>Update Slide</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PortfolioCategoriesPanel({ categories, onReload }: { categories: PortfolioCategory[]; onReload: () => Promise<void> }) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PortfolioCategory | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<PortfolioCategory>(emptyPortfolioCategory(categories.length + 1))

  const openNew = () => {
    setSelectedId(null)
    setForm(emptyPortfolioCategory(categories.length + 1))
    setDialogOpen(true)
  }
  const openEdit = (item: PortfolioCategory) => {
    setSelectedId(item.id)
    setForm(item)
    setDialogOpen(true)
  }
  const save = async () => {
    const response = await authedFetch(selectedId ? `/api/bespoke/portfolio-categories/${selectedId}` : '/api/bespoke/portfolio-categories', {
      method: selectedId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        ...form,
        slug: form.slug || slugify(form.name),
      }),
    })
    const payload = await response.json().catch(() => null)
    if (response.ok) {
      setDialogOpen(false)
      setConfirmOpen(false)
      await onReload()
      toast({ title: 'Portfolio category saved', description: `${form.name} was updated successfully.` })
    } else {
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save category.', variant: 'destructive' })
    }
  }
  const remove = async () => {
    if (!deleteTarget) return
    const response = await authedFetch(`/api/bespoke/portfolio-categories/${deleteTarget.id}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => null)
    if (response.ok) {
      setDeleteTarget(null)
      await onReload()
      toast({ title: 'Portfolio category deleted', description: 'Bespoke portfolio category removed.' })
    } else {
      toast({ title: 'Delete failed', description: payload?.error ?? 'Unable to delete category.', variant: 'destructive' })
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white p-6 shadow-xs space-y-6">
      <SectionHeader title="Portfolio Categories" description="Categories map to the storefront filter pills." actionLabel="Add Category" onAction={openNew} />
      <DataTable
        headers={['Name', 'Slug', 'Order', 'Status', 'Edit', 'Delete']}
        rows={categories.map((item) => ({
          id: item.id,
          cells: [
            item.name,
            item.slug,
            item.display_order,
            item.status === 'active' ? 'Active' : 'Hidden',
            <IconButton key="edit" onClick={() => openEdit(item)}><Edit2 size={14} className="text-muted-foreground" /></IconButton>,
            <IconButton key="delete" onClick={() => setDeleteTarget(item)} destructive><Trash2 size={14} className="text-red-600" /></IconButton>,
          ],
        }))}
      />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={selectedId ? 'Edit Portfolio Category' : 'Add Portfolio Category'} description="Manage Bespoke portfolio filter categories.">
        <Field label="Name"><input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value, slug: prev.slug || slugify(e.target.value) }))} className={inputClassName} /></Field>
        <Field label="Slug"><input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} className={inputClassName} /></Field>
        <Field label="Display Order"><input type="number" value={form.display_order} onChange={(e) => setForm((prev) => ({ ...prev, display_order: Number(e.target.value) || 0 }))} className={inputClassName} /></Field>
        <Field label="Status"><ToggleRow options={['Active', 'Hidden']} value={form.status === 'hidden' ? 'Hidden' : 'Active'} onChange={(value) => setForm((prev) => ({ ...prev, status: value === 'Hidden' ? 'hidden' : 'active' }))} /></Field>
        <Actions onSave={() => setConfirmOpen(true)} onCancel={() => setDialogOpen(false)} />
      </FormDialog>
      <ConfirmDialog isOpen={confirmOpen} title={selectedId ? 'Update category?' : 'Create category?'} description="This will save the portfolio category." confirmText="Save" onConfirm={() => void save()} onCancel={() => setConfirmOpen(false)} />
      <ConfirmDialog isOpen={Boolean(deleteTarget)} title="Delete category?" description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`} confirmText="Delete" type="delete" onConfirm={() => void remove()} onCancel={() => setDeleteTarget(null)} />
    </section>
  )
}

function PortfolioItemsPanel({ categories, items, onReload }: { categories: PortfolioCategory[]; items: PortfolioItem[]; onReload: () => Promise<void> }) {
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<PortfolioItem>(emptyPortfolioItem(categories[0]?.id ?? '', items.length + 1))
  const categoryName = (id: string) => categories.find((item) => item.id === id)?.name ?? ''

  const openNew = () => {
    setSelectedId(null)
    setForm(emptyPortfolioItem(categories[0]?.id ?? '', items.length + 1))
    setDialogOpen(true)
  }
  const openEdit = (item: PortfolioItem) => {
    setSelectedId(item.id)
    setForm(item)
    setDialogOpen(true)
  }
  const uploadMedia = async (file: File, kind: 'image' | 'video') => {
    const body = new FormData()
    body.append('file', file)
    body.append('kind', kind)
    const response = await authedFetch('/api/bespoke/media', { method: 'POST', body })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.path) throw new Error(payload?.error ?? 'Unable to upload media.')
    return payload.path as string
  }
  const save = async () => {
    const response = await authedFetch(selectedId ? `/api/bespoke/portfolio-items/${selectedId}` : '/api/bespoke/portfolio-items', {
      method: selectedId ? 'PATCH' : 'POST',
      body: JSON.stringify(form),
    })
    const payload = await response.json().catch(() => null)
    if (response.ok) {
      setDialogOpen(false)
      setConfirmOpen(false)
      await onReload()
      toast({ title: 'Portfolio item saved', description: `${form.title} was updated successfully.` })
    } else {
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save item.', variant: 'destructive' })
    }
  }
  const remove = async () => {
    if (!deleteTarget) return
    const response = await authedFetch(`/api/bespoke/portfolio-items/${deleteTarget.id}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => null)
    if (response.ok) {
      setDeleteTarget(null)
      await onReload()
      toast({ title: 'Portfolio item deleted', description: 'Bespoke portfolio item removed.' })
    } else {
      toast({ title: 'Delete failed', description: payload?.error ?? 'Unable to delete item.', variant: 'destructive' })
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white p-6 shadow-xs space-y-6">
      <SectionHeader title="Portfolio Items" description="These render in the Bespoke portfolio grid and modal." actionLabel="Add Item" onAction={openNew} />
      <DataTable
        headers={['Title', 'Tag', 'Category', 'Media', 'Order', 'Edit', 'Delete']}
        rows={items.map((item) => ({
          id: item.id,
          cells: [
            item.title,
            item.tag,
            categoryName(item.category_id),
            item.media_type,
            item.display_order,
            <IconButton key="edit" onClick={() => openEdit(item)}><Edit2 size={14} className="text-muted-foreground" /></IconButton>,
            <IconButton key="delete" onClick={() => setDeleteTarget(item)} destructive><Trash2 size={14} className="text-red-600" /></IconButton>,
          ],
        }))}
      />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={selectedId ? 'Edit Portfolio Item' : 'Add Portfolio Item'} description="Manage Bespoke showcase items.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title"><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className={inputClassName} /></Field>
          <Field label="Tag"><input value={form.tag} onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value }))} className={inputClassName} /></Field>
          <Field label="Category">
            <Select value={form.category_id} onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Media Type">
            <Select value={form.media_type} onValueChange={(value) => setForm((prev) => ({ ...prev, media_type: value as 'image' | 'video' }))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select media type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Gem Style"><input value={form.gem_style ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, gem_style: e.target.value }))} className={inputClassName} /></Field>
          <Field label="Gem Color"><input value={form.gem_color ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, gem_color: e.target.value }))} className={inputClassName} /></Field>
          <Field label="Display Order"><input type="number" value={form.display_order} onChange={(e) => setForm((prev) => ({ ...prev, display_order: Number(e.target.value) || 0 }))} className={inputClassName} /></Field>
          <Field label="Theme"><ToggleRow options={['Light', 'Dark']} value={form.dark_theme ? 'Dark' : 'Light'} onChange={(value) => setForm((prev) => ({ ...prev, dark_theme: value === 'Dark' }))} /></Field>
        </div>
        <Field label="Short Description"><textarea value={form.short_description ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))} rows={4} className={inputClassName} /></Field>
        <Field label="Status"><ToggleRow options={['Active', 'Hidden']} value={form.status === 'hidden' ? 'Hidden' : 'Active'} onChange={(value) => setForm((prev) => ({ ...prev, status: value === 'Hidden' ? 'hidden' : 'active' }))} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={form.media_type === 'image' ? 'Image Upload' : 'Video Upload'}>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/30">
              {form.media_type === 'image' ? <Upload size={16} /> : <Video size={16} />}
              <span>{form.media_type === 'image' ? 'Upload Image' : 'Upload Video'}</span>
              <input
                type="file"
                accept={form.media_type === 'image' ? 'image/*' : 'video/*'}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const path = await uploadMedia(file, form.media_type)
                    setForm((prev) => ({ ...prev, media_path: path }))
                    toast({ title: 'Upload complete', description: 'Media uploaded successfully.' })
                  } catch (error) {
                    toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Unable to upload media.', variant: 'destructive' })
                  }
                }}
              />
            </label>
            {form.media_path ? <p className="mt-2 text-xs text-muted-foreground">{form.media_path}</p> : null}
          </Field>
          <Field label="Thumbnail Upload">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary/30">
              <Upload size={16} />
              <span>Upload Thumbnail</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const path = await uploadMedia(file, 'image')
                    setForm((prev) => ({ ...prev, thumbnail_path: path }))
                    toast({ title: 'Thumbnail uploaded', description: 'Thumbnail uploaded successfully.' })
                  } catch (error) {
                    toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Unable to upload thumbnail.', variant: 'destructive' })
                  }
                }}
              />
            </label>
            {form.thumbnail_path ? <p className="mt-2 text-xs text-muted-foreground">{form.thumbnail_path}</p> : null}
          </Field>
        </div>
        <Actions onSave={() => setConfirmOpen(true)} onCancel={() => setDialogOpen(false)} />
      </FormDialog>
      <ConfirmDialog isOpen={confirmOpen} title={selectedId ? 'Update item?' : 'Create item?'} description="This will save the portfolio item." confirmText="Save" onConfirm={() => void save()} onCancel={() => setConfirmOpen(false)} />
      <ConfirmDialog isOpen={Boolean(deleteTarget)} title="Delete item?" description={`Are you sure you want to delete "${deleteTarget?.title ?? ''}"?`} confirmText="Delete" type="delete" onConfirm={() => void remove()} onCancel={() => setDeleteTarget(null)} />
    </section>
  )
}

function FormPanel({ formConfig, setFormConfig, onReload }: { formConfig: FormConfig; setFormConfig: (value: FormConfig) => void; onReload: () => Promise<void> }) {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const updateList = (key: keyof Omit<FormConfig, 'settings'>, updater: (rows: SimpleRow[]) => SimpleRow[]) => {
    setFormConfig({ ...formConfig, [key]: updater(formConfig[key]) } as FormConfig)
  }

  const save = async () => {
    const response = await authedFetch('/api/bespoke/form-config', {
      method: 'PUT',
      body: JSON.stringify(formConfig),
    })
    const payload = await response.json().catch(() => null)
    if (response.ok) {
      setConfirmOpen(false)
      await onReload()
      toast({ title: 'Form settings saved', description: 'Bespoke form content was updated.' })
    } else {
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save form settings.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-white p-6 shadow-xs space-y-5">
        <Field label="Intro Heading"><input value={formConfig.settings?.intro_heading ?? ''} onChange={(e) => setFormConfig({ ...formConfig, settings: { ...(formConfig.settings ?? {}), intro_heading: e.target.value } })} className={inputClassName} /></Field>
        <Field label="Intro Subtitle"><textarea value={formConfig.settings?.intro_subtitle ?? ''} onChange={(e) => setFormConfig({ ...formConfig, settings: { ...(formConfig.settings ?? {}), intro_subtitle: e.target.value } })} rows={4} className={inputClassName} /></Field>
        <Field label="Footer Note"><textarea value={formConfig.settings?.footer_note ?? ''} onChange={(e) => setFormConfig({ ...formConfig, settings: { ...(formConfig.settings ?? {}), footer_note: e.target.value } })} rows={3} className={inputClassName} /></Field>
      </section>
      <RepeatableListSection title="Guarantees" items={formConfig.guarantees} onChange={(rows) => updateList('guarantees', () => rows)} />
      <RepeatableListSection title="Piece Types" items={formConfig.pieceTypes} onChange={(rows) => updateList('pieceTypes', () => rows)} />
      <RepeatableListSection title="Stone Options" items={formConfig.stoneOptions} onChange={(rows) => updateList('stoneOptions', () => rows)} />
      <RepeatableListSection title="Carat Options" items={formConfig.caratOptions} onChange={(rows) => updateList('caratOptions', () => rows)} />
      <RepeatableListSection title="Metal Options" items={formConfig.metalOptions} onChange={(rows) => updateList('metalOptions', () => rows)} />
      <div className="flex justify-end"><button type="button" onClick={() => setConfirmOpen(true)} className={primaryButtonClassName}>Save Form Settings</button></div>
      <ConfirmDialog isOpen={confirmOpen} title="Save form settings?" description="This will update the live Bespoke enquiry form." confirmText="Save" onConfirm={() => void save()} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}

function RepeatableListSection({ title, items, onChange }: { title: string; items: SimpleRow[]; onChange: (rows: SimpleRow[]) => void }) {
  return (
    <section className="rounded-lg border border-border bg-white p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-jakarta text-lg font-semibold text-foreground">{title}</h2>
        <button type="button" onClick={() => onChange([...(items ?? []), emptySimpleRow((items?.length ?? 0) + 1)])} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"><Plus size={14} />Add Row</button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
            <input value={item.label} onChange={(e) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, label: e.target.value } : entry))} className={inputClassName} placeholder="Label" />
            <input type="number" value={item.display_order} onChange={(e) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, display_order: Number(e.target.value) || 0 } : entry))} className={inputClassName} placeholder="Order" />
            <Select value={item.status} onValueChange={(value) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: value as 'active' | 'hidden' } : entry))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <button type="button" onClick={() => onChange(items.filter((_, entryIndex) => entryIndex !== index))} className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No rows added yet.</p> : null}
      </div>
    </section>
  )
}

function SectionHeader({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-jakarta text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <button type="button" onClick={onAction} className={primaryButtonClassName}>
        <Plus size={16} />
        {actionLabel}
      </button>
    </div>
  )
}

function FormDialog({ title, description, open, onOpenChange, children }: { title: string; description: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
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
        <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full px-4 py-2 text-sm font-semibold ${value === option ? 'bg-primary text-white' : 'border border-border text-foreground hover:bg-secondary'}`}>{option}</button>
      ))}
    </div>
  )
}

function Actions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onSave} className={primaryButtonClassName}>Save</button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button>
    </div>
  )
}

function IconButton({ children, onClick, destructive = false }: { children: ReactNode; onClick: () => void; destructive?: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded p-1.5 transition-colors ${destructive ? 'hover:bg-red-100' : 'hover:bg-secondary'}`}>{children}</button>
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
              {headers.map((header) => <th key={header} className="px-6 py-3.5 text-left text-xs font-semibold text-foreground">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                {row.cells.map((cell, index) => <td key={`${row.id}-${index}`} className="px-6 py-3.5 text-sm text-foreground">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={currentPage} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  )
}

const inputClassName = 'w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm'
const primaryButtonClassName = 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90'
