import {
  slugify,
  type CatalogCategory,
  type CatalogCertificate,
  type CatalogMetal,
  type CatalogOption,
  type CatalogRingSize,
  type CatalogStoneShape,
  type CatalogSubcategory,
} from '@/lib/product-catalog'

export type NavbarItemType = 'mega' | 'direct'
export type NavbarSectionType =
  | 'Subcategory Options'
  | 'Manual Links'
  | 'Metal Swatches'
  | 'Stone Shapes'
  | 'Ring Sizes'
  | 'Certificates'
  | 'Category Link'

export type NavbarManualLink = {
  label: string
  url: string
}

export type NavbarSectionSourceKind = 'subcategory_option' | 'metal' | 'stone_shape' | 'ring_size' | 'certificate'

export type NavbarSectionSourceItem = {
  sourceKind: NavbarSectionSourceKind
  sourceItemId: string
  label: string
  sortOrder: number
  isActive: boolean
}

export type NavbarSection = {
  id: string
  title: string
  type: NavbarSectionType
  sourceLabel: string
  sourceSubcategoryId: string | null
  sourceCategorySlug?: string | null
  column: number
  showAsFilter?: boolean
  enableCategoryLink?: boolean
  linkedCategoryId?: string | null
  selectedSourceItems?: NavbarSectionSourceItem[]
  links: NavbarManualLink[]
}

export type NavbarItem = {
  id: string
  label: string
  slug: string
  type: NavbarItemType
  visible: boolean
  url?: string
  columns?: number
  sections?: NavbarSection[]
  featuredImage?: {
    enabled: boolean
    imageUrl: string
    buttonLabel: string
    buttonUrl: string
    imageAlt: string
  }
}

export type NavbarBuilderPayload = {
  items: NavbarItem[]
  categories: CatalogCategory[]
  subcategories: CatalogSubcategory[]
  options: CatalogOption[]
  metals: CatalogMetal[]
  stoneShapes: CatalogStoneShape[]
  ringSizes?: CatalogRingSize[]
  certificates?: CatalogCertificate[]
}

type RawNavbarItem = {
  id: string
  label: string
  slug: string
  item_type: 'mega_menu' | 'direct_link'
  linked_category_id: string | null
  direct_link_url: string | null
  display_order: number
  status: 'active' | 'hidden'
}

type RawNavbarSection = {
  id: string
  navbar_item_id: string
  title: string
  section_type: 'category_list' | 'manual_links' | 'metal_swatches' | 'stone_shapes' | 'ring_sizes' | 'certificates' | 'category_link'
  source_subcategory_id: string | null
  source_category_slug?: string | null
  enable_category_link?: boolean | null
  linked_category_id?: string | null
  column_number: number
  show_as_filter?: boolean | null
  display_order: number
  status: 'active' | 'hidden'
}

type RawNavbarSectionSourceItem = {
  section_id: string
  source_kind: NavbarSectionSourceKind
  source_item_id: string
  sort_order: number
  is_active: boolean
}

type RawNavbarSectionLink = {
  id: string
  section_id: string
  label: string
  url: string
  display_order: number
  status: 'active' | 'hidden'
}

type RawNavbarFeaturedCard = {
  navbar_item_id: string
  image_path: string | null
  image_alt: string | null
  button_label: string | null
  button_url: string | null
  enabled: boolean
}

export function mapSectionTypeFromDb(type: RawNavbarSection['section_type']): NavbarSectionType {
  if (type === 'category_list') return 'Subcategory Options'
  if (type === 'manual_links') return 'Manual Links'
  if (type === 'metal_swatches') return 'Metal Swatches'
  if (type === 'ring_sizes') return 'Ring Sizes'
  if (type === 'certificates') return 'Certificates'
  if (type === 'category_link') return 'Category Link'
  return 'Stone Shapes'
}

export function mapSectionTypeToDb(type: NavbarSectionType): RawNavbarSection['section_type'] {
  if (type === 'Subcategory Options') return 'category_list'
  if (type === 'Manual Links') return 'manual_links'
  if (type === 'Metal Swatches') return 'metal_swatches'
  if (type === 'Ring Sizes') return 'ring_sizes'
  if (type === 'Certificates') return 'certificates'
  if (type === 'Category Link') return 'category_link'
  return 'stone_shapes'
}

export function buildFallbackNavbarItems(categories: CatalogCategory[], subcategories: CatalogSubcategory[]): NavbarItem[] {
  return categories
    .filter((category) => category.status === 'active' && category.show_in_nav !== false)
    .sort((left, right) => left.display_order - right.display_order)
    .map((category) => {
      const categorySubcategories = subcategories
        .filter((entry) => entry.category_id === category.id && entry.status === 'active')
        .sort((left, right) => left.display_order - right.display_order)

      const sections = categorySubcategories.map((entry, index) => ({
        id: `fallback-${category.id}-${entry.id}`,
        title: entry.name,
        type: 'Subcategory Options' as const,
        sourceLabel: entry.name,
        sourceSubcategoryId: entry.id,
        column: index + 1,
        links: [],
      }))

      return {
        id: `fallback-${category.id}`,
        label: category.name,
        slug: category.slug,
        type: category.nav_type === 'direct_link' ? 'direct' : 'mega',
        visible: true,
        url: category.direct_link_url ?? undefined,
        columns: Math.max(1, sections.length),
        sections,
        featuredImage: {
          enabled: false,
          imageUrl: '',
          buttonLabel: '',
          buttonUrl: '',
          imageAlt: category.name,
        },
      }
    })
}

export function buildNavbarItemsFromRows(args: {
  items: RawNavbarItem[]
  sections: RawNavbarSection[]
  sectionLinks: RawNavbarSectionLink[]
  sectionSourceItems: RawNavbarSectionSourceItem[]
  featuredCards: RawNavbarFeaturedCard[]
  categories: CatalogCategory[]
  subcategories: CatalogSubcategory[]
  metals: CatalogMetal[]
  stoneShapes: CatalogStoneShape[]
  ringSizes?: CatalogRingSize[]
  certificates?: CatalogCertificate[]
  options?: CatalogOption[]
}): NavbarItem[] {
  const {
    items,
    sections,
    sectionLinks,
    sectionSourceItems,
    featuredCards,
    categories,
    subcategories,
    metals,
    stoneShapes,
    ringSizes = [],
    certificates = [],
    options = [],
  } = args

  const categoryById = new Map(categories.map((entry) => [entry.id, entry]))
  const labelMaps = {
    subcategory_option: new Map(options.map((entry) => [entry.id, entry.name])),
    metal: new Map(metals.map((entry) => [entry.id, entry.name])),
    stone_shape: new Map(stoneShapes.map((entry) => [entry.id, entry.name])),
    ring_size: new Map(ringSizes.map((entry) => [entry.id, entry.name])),
    certificate: new Map(certificates.map((entry) => [entry.id, entry.name])),
  } as const

  return items
    .sort((left, right) => left.display_order - right.display_order)
    .map((item) => {
      const itemSections = sections
        .filter((section) => section.navbar_item_id === item.id)
        .sort((left, right) => left.display_order - right.display_order)
        .map((section) => {
          const sourceSubcategory = subcategories.find((entry) => entry.id === section.source_subcategory_id)
          return {
            id: section.id,
            title: section.title,
            type: mapSectionTypeFromDb(section.section_type),
            sourceLabel: sourceSubcategory?.name ?? section.source_category_slug ?? '',
            sourceSubcategoryId: sourceSubcategory?.id ?? null,
            sourceCategorySlug: section.source_category_slug ?? null,
            column: section.column_number,
            showAsFilter: section.show_as_filter ?? false,
            enableCategoryLink: Boolean(section.enable_category_link),
            linkedCategoryId: section.linked_category_id ?? null,
            selectedSourceItems: sectionSourceItems
              .filter((entry) => entry.section_id === section.id)
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((entry) => ({
                sourceKind: entry.source_kind,
                sourceItemId: entry.source_item_id,
                label: labelMaps[entry.source_kind].get(entry.source_item_id) ?? entry.source_item_id,
                sortOrder: entry.sort_order,
                isActive: entry.is_active,
              })),
            links: sectionLinks
              .filter((entry) => entry.section_id === section.id)
              .sort((left, right) => left.display_order - right.display_order)
              .map((entry) => ({
                label: entry.label,
                url: entry.url,
              })),
          }
        })

      const featuredCard = featuredCards.find((entry) => entry.navbar_item_id === item.id)

      return {
        id: item.id,
        label: item.label,
        slug: item.slug,
        type: item.item_type === 'mega_menu' ? 'mega' : 'direct',
        visible: item.status === 'active',
        url: item.direct_link_url ?? undefined,
        columns: itemSections.reduce((max, section) => Math.max(max, section.column), 1),
        sections: itemSections,
        featuredImage: {
          enabled: featuredCard?.enabled ?? false,
          imageUrl: featuredCard?.image_path ?? '',
          buttonLabel: featuredCard?.button_label ?? '',
          buttonUrl: featuredCard?.button_url ?? '',
          imageAlt: featuredCard?.image_alt ?? item.label,
        },
      }
    })
}

export function buildSectionPreviewItems(args: {
  section: Pick<NavbarSection, 'type' | 'sourceSubcategoryId' | 'selectedSourceItems' | 'enableCategoryLink' | 'linkedCategoryId'>
  categories: CatalogCategory[]
  subcategories: CatalogSubcategory[]
  options: CatalogOption[]
  metals: CatalogMetal[]
  stoneShapes: CatalogStoneShape[]
  ringSizes?: CatalogRingSize[]
  certificates?: CatalogCertificate[]
}): string[] {
  const { section, categories, options, metals, stoneShapes, ringSizes = [], certificates = [] } = args

  const selectedIds = new Set((section.selectedSourceItems ?? []).filter((entry) => entry.isActive).map((entry) => entry.sourceItemId))

  if (section.type === 'Metal Swatches') {
    const metalItems = metals
      .filter((entry) => entry.status === 'active')
      .filter((entry) => selectedIds.size === 0 || selectedIds.has(entry.id))
      .sort((left, right) => left.display_order - right.display_order)
      .map((entry) => entry.name)

    if (section.enableCategoryLink && section.linkedCategoryId) {
      const category = categories.find((entry) => entry.id === section.linkedCategoryId)
      if (category) metalItems.push(category.name)
    }

    return metalItems
  }

  if (section.type === 'Stone Shapes') {
    const shapeItems = stoneShapes
      .filter((entry) => entry.status === 'active')
      .filter((entry) => selectedIds.size === 0 || selectedIds.has(entry.id))
      .sort((left, right) => left.display_order - right.display_order)
      .map((entry) => entry.name)

    if (section.enableCategoryLink && section.linkedCategoryId) {
      const category = categories.find((entry) => entry.id === section.linkedCategoryId)
      if (category) shapeItems.push(category.name)
    }

    return shapeItems
  }

  if (section.type === 'Ring Sizes') {
    const sizeItems = ringSizes
      .filter((entry) => entry.status === 'active')
      .filter((entry) => selectedIds.size === 0 || selectedIds.has(entry.id))
      .sort((left, right) => left.display_order - right.display_order)
      .map((entry) => entry.name)

    if (section.enableCategoryLink && section.linkedCategoryId) {
      const category = categories.find((entry) => entry.id === section.linkedCategoryId)
      if (category) sizeItems.push(category.name)
    }

    return sizeItems
  }

  if (section.type === 'Certificates') {
    const certificateItems = certificates
      .filter((entry) => !entry.status || entry.status === 'active')
      .filter((entry) => selectedIds.size === 0 || selectedIds.has(entry.id))
      .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0))
      .map((entry) => entry.name)

    if (section.enableCategoryLink && section.linkedCategoryId) {
      const category = categories.find((entry) => entry.id === section.linkedCategoryId)
      if (category) certificateItems.push(category.name)
    }

    return certificateItems
  }

  if (section.type === 'Subcategory Options' && section.sourceSubcategoryId) {
    const optionItems = options
      .filter((entry) => entry.subcategory_id === section.sourceSubcategoryId && entry.status === 'active')
      .filter((entry) => selectedIds.size === 0 || selectedIds.has(entry.id))
      .sort((left, right) => left.display_order - right.display_order)
      .map((entry) => entry.name)

    if (section.enableCategoryLink && section.linkedCategoryId) {
      const category = categories.find((entry) => entry.id === section.linkedCategoryId)
      if (category) optionItems.push(category.name)
    }

    return optionItems
  }

  return []
}

export function getSectionCategoryOptions(subcategories: CatalogSubcategory[]) {
  return subcategories
    .filter((entry) => entry.status === 'active')
    .sort((left, right) => left.display_order - right.display_order)
    .map((entry) => ({
      id: entry.id,
      label: entry.name,
      slug: entry.slug,
    }))
}

export function normalizeNavbarItemForSave(item: NavbarItem): NavbarItem {
  return {
    ...item,
    slug: item.slug || slugify(item.label),
    sections: (item.sections ?? []).map((section, index) => ({
      ...section,
      title: section.title.trim(),
      column: Math.max(1, section.column || 1),
      links:
        section.type === 'Manual Links'
          ? section.links.filter((entry) => entry.label.trim() && entry.url.trim())
          : [],
      sourceLabel: section.sourceLabel.trim(),
      showAsFilter: Boolean(section.showAsFilter),
      enableCategoryLink: Boolean(section.enableCategoryLink),
      linkedCategoryId: section.linkedCategoryId ?? null,
      selectedSourceItems: (section.selectedSourceItems ?? [])
        .filter((entry) => entry.sourceItemId)
        .sort((left, right) => left.sortOrder - right.sortOrder),
      id: section.id || `section-${index + 1}`,
    })),
  }
}
