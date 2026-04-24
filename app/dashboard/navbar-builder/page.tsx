'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  buildSectionPreviewItems,
  getSectionCategoryOptions,
  type NavbarSectionSourceItem,
  type NavbarBuilderPayload,
  type NavbarItem,
  type NavbarSection,
  type NavbarSectionType,
} from '@/lib/navbar'

const SECTION_TYPE_OPTIONS: NavbarSectionType[] = ['Subcategory Options', 'Category Link', 'Metal Swatches', 'Stone Shapes', 'Ring Sizes', 'Certificates', 'Manual Links']

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export default function NavbarBuilderPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<NavbarItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [sectionDraft, setSectionDraft] = useState<NavbarSection | null>(null)
  const [catalog, setCatalog] = useState<Omit<NavbarBuilderPayload, 'items'>>({
    categories: [],
    subcategories: [],
    options: [],
    metals: [],
    stoneShapes: [],
    ringSizes: [],
    certificates: [],
  })

  useEffect(() => {
    void loadNavbar()
  }, [])

  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0]

  const previewColumns = useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'mega') return []
    const count = Math.max(1, ...(selectedItem.sections ?? []).map((section) => section.column))
    return Array.from({ length: count }, (_, index) => ({
      column: index + 1,
      sections: (selectedItem.sections ?? []).filter((section) => section.column === index + 1),
    }))
  }, [selectedItem])

  const sectionCategoryOptions = useMemo(
    () => getSectionCategoryOptions(catalog.subcategories),
    [catalog.subcategories]
  )

  const dynamicSourceChoices = useMemo(() => {
    if (!sectionDraft) return []

    if (sectionDraft.type === 'Subcategory Options' && sectionDraft.sourceSubcategoryId) {
      return catalog.options
        .filter((entry) => entry.subcategory_id === sectionDraft.sourceSubcategoryId && entry.status === 'active')
        .sort((left, right) => left.display_order - right.display_order)
        .map((entry) => ({ id: entry.id, label: entry.name, kind: 'subcategory_option' as const }))
    }

    if (sectionDraft.type === 'Metal Swatches') {
      return catalog.metals
        .filter((entry) => entry.status === 'active')
        .sort((left, right) => left.display_order - right.display_order)
        .map((entry) => ({ id: entry.id, label: entry.name, kind: 'metal' as const }))
    }

    if (sectionDraft.type === 'Stone Shapes') {
      return catalog.stoneShapes
        .filter((entry) => entry.status === 'active')
        .sort((left, right) => left.display_order - right.display_order)
        .map((entry) => ({ id: entry.id, label: entry.name, kind: 'stone_shape' as const }))
    }

    if (sectionDraft.type === 'Ring Sizes') {
      return (catalog.ringSizes ?? [])
        .filter((entry) => entry.status === 'active')
        .sort((left, right) => left.display_order - right.display_order)
        .map((entry) => ({ id: entry.id, label: entry.name, kind: 'ring_size' as const }))
    }

    if (sectionDraft.type === 'Certificates') {
      return (catalog.certificates ?? [])
        .filter((entry) => !entry.status || entry.status === 'active')
        .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0))
        .map((entry) => ({ id: entry.id, label: entry.name, kind: 'certificate' as const }))
    }

    return []
  }, [catalog, sectionDraft])

  const sectionSummary = (section: NavbarSection) => {
    if (section.type === 'Subcategory Options') return section.sourceLabel || 'No subcategory selected'
    if (section.type === 'Category Link') return section.sourceLabel || 'No category selected'
    if (section.type === 'Manual Links') return `${section.links.length} manual link${section.links.length === 1 ? '' : 's'}`
    return section.type
  }

  const sectionSourceHint = (type: NavbarSectionType) =>
    type === 'Subcategory Options'
      ? 'Pick a subcategory. This section will automatically show all options linked to that subcategory.'
      : type === 'Category Link'
        ? 'Pick a category. This section will render a direct category link instead of option links.'
        : type === 'Metal Swatches'
          ? 'This section pulls directly from the Metals master table.'
          : type === 'Stone Shapes'
            ? 'This section pulls directly from the Stone Shapes master table.'
            : type === 'Ring Sizes'
              ? 'This section pulls directly from the Ring Sizes master table.'
              : type === 'Certificates'
                ? 'This section pulls directly from the Certificates master table.'
                : 'Add manual links to control exactly what appears in this section.'

  const buildDefaultSection = (): NavbarSection => {
    const firstOption = sectionCategoryOptions[0]
    return {
      id: `section-${Date.now()}`,
      title: '',
      type: 'Subcategory Options',
      sourceLabel: firstOption?.label ?? '',
      sourceSubcategoryId: firstOption?.id ?? null,
      sourceCategorySlug: null,
      column: 1,
      showAsFilter: false,
      enableCategoryLink: false,
      linkedCategoryId: null,
      selectedSourceItems: [],
      links: [{ label: '', url: '' }],
    }
  }

  const loadNavbar = async () => {
    setLoading(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return

      const response = await fetch('/api/navbar', {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const payload = (await response.json().catch(() => null)) as NavbarBuilderPayload | { error?: string } | null

      if (!response.ok || !payload || !('items' in payload)) {
        throw new Error((payload as { error?: string } | null)?.error ?? 'Failed to load navbar builder.')
      }

      setItems(payload.items)
      setSelectedId(payload.items[0]?.id ?? '')
      setCatalog({
        categories: payload.categories,
        subcategories: payload.subcategories,
        options: payload.options,
        metals: payload.metals,
        stoneShapes: payload.stoneShapes,
        ringSizes: payload.ringSizes ?? [],
        certificates: payload.certificates ?? [],
      })
    } catch (error) {
      toast({
        title: 'Load failed',
        description: error instanceof Error ? error.message : 'Unable to load navbar builder.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateItem = (id: string, updater: (item: NavbarItem) => NavbarItem) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
  }

  const updateSection = (itemId: string, sectionId: string, updater: (section: NavbarSection) => NavbarSection) => {
    updateItem(itemId, (item) => ({
      ...item,
      sections: (item.sections ?? []).map((section) => (section.id === sectionId ? updater(section) : section)),
    }))
  }

  const openAddSectionDialog = () => {
    if (!selectedItem || selectedItem.type !== 'mega') return
    setEditingSectionId(null)
    setSectionDraft(buildDefaultSection())
    setSectionDialogOpen(true)
  }

  const openEditSectionDialog = (section: NavbarSection) => {
    setEditingSectionId(section.id)
    setSectionDraft({
      ...section,
      showAsFilter: Boolean(section.showAsFilter),
      enableCategoryLink: Boolean(section.enableCategoryLink),
      linkedCategoryId: section.linkedCategoryId ?? null,
      selectedSourceItems: section.selectedSourceItems ?? [],
      links: section.links.length > 0 ? section.links : [{ label: '', url: '' }],
    })
    setSectionDialogOpen(true)
  }

  const saveSectionDraft = () => {
    if (!selectedItem || selectedItem.type !== 'mega' || !sectionDraft) return

    const nextSection = {
      ...sectionDraft,
      title: sectionDraft.title.trim(),
      showAsFilter: Boolean(sectionDraft.showAsFilter),
      links:
        sectionDraft.type === 'Manual Links'
          ? sectionDraft.links
          : [],
    }

    updateItem(selectedItem.id, (item) => ({
      ...item,
      sections: editingSectionId
        ? (item.sections ?? []).map((section) => (section.id === editingSectionId ? nextSection : section))
        : [...(item.sections ?? []), nextSection],
    }))

    setSectionDialogOpen(false)
    setEditingSectionId(null)
    setSectionDraft(null)
  }

  const saveNavbar = async () => {
    setSaving(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Missing access token.')

      const response = await fetch('/api/navbar', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ items }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to save navbar builder.')
      }

      setConfirmOpen(false)
      toast({
        title: 'Saved',
        description: 'Navbar builder updated successfully.',
      })
      await loadNavbar()
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save navbar builder.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-jakarta text-3xl font-semibold text-foreground">Navbar Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the dynamic mega menu using the saved catalog categories and sections.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Navigation items and their child sections load from the database.</p>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={loading || saving || items.length === 0}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save Navbar
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-lg border border-border bg-white p-6 shadow-xs">
          <div className="mb-5">
            <h2 className="font-jakarta text-lg font-semibold text-foreground">Navigation Items</h2>
            <p className="mt-1 text-sm text-muted-foreground">Drag handles are visual for now.</p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading navbar items...</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border px-4 py-4 transition-colors ${
                    selectedId === item.id ? 'border-primary bg-secondary/30' : 'border-border bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-secondary"
                      aria-label={`Reorder ${item.label}`}
                    >
                      <GripVertical size={16} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.label}</p>
                          <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Mega Menu
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, (current) => ({ ...current, visible: !current.visible }))}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            item.visible ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {item.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          {item.visible ? 'Visible' : 'Hidden'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-white p-6 shadow-xs">
          <div className="mb-6">
            <h2 className="font-jakarta text-lg font-semibold text-foreground">Edit Panel</h2>
            <p className="mt-1 text-sm text-muted-foreground">The live mega menu structure stored in SQL.</p>
          </div>

          {selectedItem && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-1">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Nav Label</label>
                  <input
                    value={selectedItem.label}
                    onChange={(e) => updateItem(selectedItem.id, (item) => ({ ...item, label: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-jakarta text-base font-semibold text-foreground">Sections</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Add and arrange mega menu content blocks.</p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddSectionDialog}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                  >
                    <Plus size={14} />
                    Add Section
                  </button>
                </div>

                <div className="space-y-4">
                  {(selectedItem.sections ?? []).map((section) => {
                    const previewItems = buildSectionPreviewItems({
                      section,
                      categories: catalog.categories,
                      subcategories: catalog.subcategories,
                      options: catalog.options,
                      metals: catalog.metals,
                      stoneShapes: catalog.stoneShapes,
                      ringSizes: catalog.ringSizes,
                      certificates: catalog.certificates,
                    })

                    return (
                      <div key={section.id} className="rounded-xl border border-border bg-white p-4 shadow-xs">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-jakarta text-base font-semibold text-foreground">
                                {section.title || 'Untitled Section'}
                              </p>
                              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                                {section.type}
                              </span>
                              {section.showAsFilter ? (
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                  Filter On
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {sectionSummary(section)} · Column {section.column}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditSectionDialog(section)}
                              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(selectedItem.id, (item) => ({
                                  ...item,
                                  sections: (item.sections ?? []).filter((entry) => entry.id !== section.id),
                                }))
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg border border-border bg-secondary/20 px-4 py-4">
                          <p className="text-sm font-semibold text-foreground">Preview</p>
                          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {previewItems.map((item) => (
                              <p key={`${section.id}-${item}`}>{item}</p>
                            ))}
                            {previewItems.length === 0 && <p>No preview items available.</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-jakarta text-base font-semibold text-foreground">Featured Image</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Optional promo block inside the mega menu.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateItem(selectedItem.id, (item) => ({
                        ...item,
                        featuredImage: {
                          enabled: !(item.featuredImage?.enabled ?? false),
                          imageUrl: item.featuredImage?.imageUrl ?? '',
                          buttonLabel: item.featuredImage?.buttonLabel ?? '',
                          buttonUrl: item.featuredImage?.buttonUrl ?? '',
                          imageAlt: item.featuredImage?.imageAlt ?? item.label,
                        },
                      }))
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      selectedItem.featuredImage?.enabled ? 'bg-primary text-white' : 'bg-secondary text-foreground'
                    }`}
                  >
                    {selectedItem.featuredImage?.enabled ? 'On' : 'Off'}
                  </button>
                </div>

                {selectedItem.featuredImage?.enabled ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <input
                      value={selectedItem.featuredImage.imageUrl}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (item) => ({
                          ...item,
                          featuredImage: { ...item.featuredImage!, imageUrl: e.target.value },
                        }))
                      }
                      placeholder="Image Path or URL"
                      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                    />
                    <input
                      value={selectedItem.featuredImage.imageAlt}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (item) => ({
                          ...item,
                          featuredImage: { ...item.featuredImage!, imageAlt: e.target.value },
                        }))
                      }
                      placeholder="Image Alt Text"
                      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                    />
                    <input
                      value={selectedItem.featuredImage.buttonLabel}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (item) => ({
                          ...item,
                          featuredImage: { ...item.featuredImage!, buttonLabel: e.target.value },
                        }))
                      }
                      placeholder="Button Label"
                      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                    />
                    <input
                      value={selectedItem.featuredImage.buttonUrl}
                      onChange={(e) =>
                        updateItem(selectedItem.id, (item) => ({
                          ...item,
                          featuredImage: { ...item.featuredImage!, buttonUrl: e.target.value },
                        }))
                      }
                      placeholder="Button URL"
                      className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border bg-secondary/20 p-5">
                <h3 className="font-jakarta text-base font-semibold text-foreground">Preview</h3>
                <div className="mt-4 space-y-3 text-sm text-foreground">
                  {previewColumns.map((column) => (
                    <p key={column.column}>
                      Column {column.column}:{' '}
                      {column.sections.length > 0
                        ? column.sections.map((section) => section.title || 'Untitled Section').join(', ')
                        : 'Empty'}
                    </p>
                  ))}
                  {selectedItem.featuredImage?.enabled ? <p>Featured image block enabled</p> : null}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save navbar changes?"
        description="This will update the live dynamic mega menu based on the saved catalog setup."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={saving}
        onConfirm={() => void saveNavbar()}
        onCancel={() => setConfirmOpen(false)}
      />

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-jakarta text-lg font-semibold text-foreground">
              {editingSectionId ? 'Edit Section' : 'Add Section'}
            </DialogTitle>
            <DialogDescription>
              Configure how this navbar section should render and whether it should also appear as a collection-page filter.
            </DialogDescription>
          </DialogHeader>

          {sectionDraft ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Section Title</label>
                  <input
                    value={sectionDraft.title}
                    onChange={(e) => setSectionDraft((current) => (current ? { ...current, title: e.target.value } : current))}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Source Kind</label>
                  <Select
                    value={sectionDraft.type}
                    onValueChange={(value) =>
                      setSectionDraft((current) => {
                        if (!current) return current
                        const nextType = value as NavbarSectionType
                        const firstSubcategory = sectionCategoryOptions[0]
                        const firstCategory = catalog.categories[0]

                        return {
                          ...current,
                          type: nextType,
                          links: nextType === 'Manual Links' ? current.links : [],
                          sourceSubcategoryId: nextType === 'Subcategory Options' ? current.sourceSubcategoryId ?? firstSubcategory?.id ?? null : null,
                          sourceCategorySlug: nextType === 'Category Link' ? current.sourceCategorySlug ?? firstCategory?.slug ?? null : null,
                          sourceLabel:
                            nextType === 'Subcategory Options'
                              ? current.sourceLabel || firstSubcategory?.label || ''
                              : nextType === 'Category Link'
                                ? current.sourceLabel || firstCategory?.name || ''
                                : '',
                          selectedSourceItems:
                            nextType === 'Manual Links' || nextType === 'Category Link'
                              ? []
                              : current.selectedSourceItems ?? [],
                        }
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select source kind" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sectionDraft.type === 'Subcategory Options' || sectionDraft.type === 'Category Link' ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {sectionDraft.type === 'Category Link' ? 'Source Category' : 'Source Subcategory'}
                    </label>
                    <Select
                      value={sectionDraft.type === 'Category Link' ? sectionDraft.sourceCategorySlug ?? '' : sectionDraft.sourceSubcategoryId ?? ''}
                      onValueChange={(value) => {
                        const option = sectionCategoryOptions.find((entry) => entry.id === value)
                        const category = catalog.categories.find((entry) => entry.slug === value)
                        setSectionDraft((current) =>
                          current
                            ? {
                                ...current,
                                sourceLabel: option?.label ?? category?.name ?? '',
                                sourceSubcategoryId: current.type === 'Category Link' ? null : option?.id ?? null,
                                sourceCategorySlug: current.type === 'Category Link' ? category?.slug ?? null : null,
                              }
                            : current
                        )
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={sectionDraft.type === 'Category Link' ? 'Select category' : 'Select subcategory'} />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionDraft.type === 'Category Link'
                          ? catalog.categories.map((category) => (
                              <SelectItem key={category.id} value={category.slug}>
                                {category.name}
                              </SelectItem>
                            ))
                          : sectionCategoryOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground md:col-span-2">
                    {sectionSourceHint(sectionDraft.type)}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Column Position</label>
                  <input
                    type="number"
                    min={1}
                    value={sectionDraft.column}
                    onChange={(e) =>
                      setSectionDraft((current) => (current ? { ...current, column: Number(e.target.value) || 1 } : current))
                    }
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              {sectionDraft.type === 'Subcategory Options' || sectionDraft.type === 'Category Link' ? (
                <p className="text-sm text-muted-foreground">{sectionSourceHint(sectionDraft.type)}</p>
              ) : null}

              {sectionDraft.type !== 'Manual Links' && sectionDraft.type !== 'Category Link' ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Select Items To Show</p>
                  <div className="grid gap-2 rounded-lg border border-border bg-secondary/10 p-4 md:grid-cols-2">
                    {dynamicSourceChoices.map((choice, index) => {
                      const isSelected = (sectionDraft.selectedSourceItems ?? []).some((entry) => entry.sourceItemId === choice.id)
                      return (
                        <label key={choice.id} className="inline-flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) =>
                              setSectionDraft((current) => {
                                if (!current) return current
                                const existing = current.selectedSourceItems ?? []

                                if (event.target.checked) {
                                  const nextItem: NavbarSectionSourceItem = {
                                    sourceKind: choice.kind,
                                    sourceItemId: choice.id,
                                    label: choice.label,
                                    sortOrder: existing.length + 1,
                                    isActive: true,
                                  }
                                  return { ...current, selectedSourceItems: [...existing, nextItem] }
                                }

                                return {
                                  ...current,
                                  selectedSourceItems: existing
                                    .filter((entry) => entry.sourceItemId !== choice.id)
                                    .map((entry, entryIndex) => ({ ...entry, sortOrder: entryIndex + 1 })),
                                }
                              })
                            }
                          />
                          <span>{choice.label}</span>
                        </label>
                      )
                    })}
                    {dynamicSourceChoices.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No source items available for this section yet.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {sectionDraft.type !== 'Manual Links' ? (
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={Boolean(sectionDraft.enableCategoryLink)}
                      onChange={(event) =>
                        setSectionDraft((current) =>
                          current
                            ? {
                                ...current,
                                enableCategoryLink: event.target.checked,
                                linkedCategoryId: event.target.checked ? current.linkedCategoryId ?? catalog.categories[0]?.id ?? null : null,
                              }
                            : current
                        )
                      }
                    />
                    Add selected category as a section link
                  </label>

                  {sectionDraft.enableCategoryLink ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Top Category</label>
                      <Select
                        value={sectionDraft.linkedCategoryId ?? ''}
                        onValueChange={(value) =>
                          setSectionDraft((current) => (current ? { ...current, linkedCategoryId: value } : current))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select top category" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Show As Filter On Collection Page</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'On', value: true },
                    { label: 'Off', value: false },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setSectionDraft((current) => (current ? { ...current, showAsFilter: option.value } : current))}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${
                        Boolean(sectionDraft.showAsFilter) === option.value
                          ? 'bg-primary text-white'
                          : 'border border-border text-foreground hover:bg-secondary'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {sectionDraft.type === 'Manual Links' ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Manual Links</p>
                  {sectionDraft.links.map((link, index) => (
                    <div key={`${sectionDraft.id}-${index}`} className="grid gap-3 md:grid-cols-2">
                      <input
                        value={link.label}
                        onChange={(e) =>
                          setSectionDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  links: current.links.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, label: e.target.value } : entry
                                  ),
                                }
                              : current
                          )
                        }
                        placeholder="Label"
                        className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                      />
                      <input
                        value={link.url}
                        onChange={(e) =>
                          setSectionDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  links: current.links.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, url: e.target.value } : entry
                                  ),
                                }
                              : current
                          )
                        }
                        placeholder="URL"
                        className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSectionDraft((current) =>
                        current
                          ? {
                              ...current,
                              links: [...current.links, { label: '', url: '' }],
                            }
                          : current
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <Plus size={14} />
                    Add Link
                  </button>
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={saveSectionDraft}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  Save Section
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSectionDialogOpen(false)
                    setEditingSectionId(null)
                    setSectionDraft(null)
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
