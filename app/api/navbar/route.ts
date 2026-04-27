import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import {
  buildFallbackNavbarItems,
  buildNavbarItemsFromRows,
  mapSectionTypeToDb,
  normalizeNavbarItemForSave,
  syncNavbarItemsWithCatalog,
  type NavbarBuilderPayload,
  type NavbarItem,
} from '@/lib/navbar'
import type { CatalogCategory } from '@/lib/product-catalog'

function getNavbarSaveErrorMessage(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return 'Failed to save navbar section.'

  if (error.message?.includes('navbar_sections_source_chk')) {
    return 'The database rules for navbar sections are out of date for this section type. Run the latest navbar SQL migration to update the navbar_sections_source_chk constraint.'
  }

  return error.message ?? 'Failed to save navbar section.'
}

async function loadCatalogSources(adminClient: any) {
  const [categoriesResult, subcategoriesResult, optionsResult, metalsResult, stoneShapesResult, certificatesResult, stylesResult] = await Promise.all([
    adminClient.from('catalog_categories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_subcategories').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_options').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_metals').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_stone_shapes').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_certificates').select('*').order('display_order', { ascending: true }),
    adminClient.from('catalog_styles').select('*').order('display_order', { ascending: true }),
  ])

  const error =
    categoriesResult.error ||
    subcategoriesResult.error ||
    optionsResult.error ||
    metalsResult.error ||
    stoneShapesResult.error

  if (error) {
    return { error }
  }

  return {
    categories: (categoriesResult.data ?? []) as CatalogCategory[],
    subcategories: subcategoriesResult.data ?? [],
    options: optionsResult.data ?? [],
    metals: metalsResult.data ?? [],
    stoneShapes: stoneShapesResult.data ?? [],
    certificates: certificatesResult.error ? [] : certificatesResult.data ?? [],
    styles: stylesResult.error ? [] : stylesResult.data ?? [],
  }
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const sources = await loadCatalogSources(access.adminClient)
  if ('error' in sources) {
    return NextResponse.json({ error: sources.error.message }, { status: 500 })
  }

  const [itemsResult, sectionsResult, linksResult, sourceItemsResult, featuredResult] = await Promise.all([
    access.adminClient.from('navbar_items').select('*').order('display_order', { ascending: true }),
    access.adminClient.from('navbar_sections').select('*').order('column_number', { ascending: true }).order('display_order', { ascending: true }),
    access.adminClient.from('navbar_section_links').select('*').order('display_order', { ascending: true }),
    access.adminClient.from('navbar_section_source_items').select('*').order('sort_order', { ascending: true }),
    access.adminClient.from('navbar_featured_cards').select('*'),
  ])

  const error =
    itemsResult.error ||
    sectionsResult.error ||
    linksResult.error ||
    sourceItemsResult.error ||
    featuredResult.error

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const builtItems =
    (itemsResult.data?.length ?? 0) > 0
      ? buildNavbarItemsFromRows({
          items: itemsResult.data ?? [],
          sections: sectionsResult.data ?? [],
          sectionLinks: linksResult.data ?? [],
          sectionSourceItems: sourceItemsResult.data ?? [],
          featuredCards: featuredResult.data ?? [],
          categories: sources.categories,
          subcategories: sources.subcategories,
          metals: sources.metals,
          stoneShapes: sources.stoneShapes,
          certificates: sources.certificates,
          styles: sources.styles,
          options: sources.options,
        })
      : buildFallbackNavbarItems(sources.categories, sources.subcategories)

  const items = syncNavbarItemsWithCatalog(builtItems, sources.categories, sources.subcategories)

  return NextResponse.json({
    items,
    categories: sources.categories,
    subcategories: sources.subcategories,
    options: sources.options,
    metals: sources.metals,
    stoneShapes: sources.stoneShapes,
    certificates: sources.certificates,
    styles: sources.styles,
  })
}

export async function PUT(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const payload = await request.json().catch(() => null)
  const incomingItems = Array.isArray(payload?.items) ? (payload.items as NavbarItem[]) : null

  if (!incomingItems) {
    return NextResponse.json({ error: 'Invalid navbar payload.' }, { status: 400 })
  }

  const itemsToSave = incomingItems
    .map(normalizeNavbarItemForSave)
    .filter((item) => item.label.trim())

  const sources = await loadCatalogSources(access.adminClient)
  if ('error' in sources) {
    return NextResponse.json({ error: sources.error.message }, { status: 500 })
  }

  const categoryBySlug = new Map<string, CatalogCategory>(sources.categories.map((entry: CatalogCategory) => [entry.slug, entry]))

  const { data: existingItems, error: existingItemsError } = await access.adminClient
    .from('navbar_items')
    .select('id')

  if (existingItemsError) {
    return NextResponse.json({ error: existingItemsError.message }, { status: 500 })
  }

  const existingItemIds = (existingItems ?? []).map((entry) => entry.id)

  if (existingItemIds.length > 0) {
    const { data: existingSections, error: sectionsLookupError } = await access.adminClient
      .from('navbar_sections')
      .select('id')
      .in('navbar_item_id', existingItemIds)

    if (sectionsLookupError) {
      return NextResponse.json({ error: sectionsLookupError.message }, { status: 500 })
    }

      const existingSectionIds = (existingSections ?? []).map((entry) => entry.id)

      if (existingSectionIds.length > 0) {
        const { error: deleteSourceItemsError } = await access.adminClient
          .from('navbar_section_source_items')
          .delete()
          .in('section_id', existingSectionIds)

        if (deleteSourceItemsError) {
          return NextResponse.json({ error: deleteSourceItemsError.message }, { status: 500 })
        }

        const { error: deleteLinksError } = await access.adminClient
          .from('navbar_section_links')
          .delete()
        .in('section_id', existingSectionIds)

      if (deleteLinksError) {
        return NextResponse.json({ error: deleteLinksError.message }, { status: 500 })
      }

      const { error: deleteSectionsError } = await access.adminClient
        .from('navbar_sections')
        .delete()
        .in('id', existingSectionIds)

      if (deleteSectionsError) {
        return NextResponse.json({ error: deleteSectionsError.message }, { status: 500 })
      }
    }

    const { error: deleteFeaturedError } = await access.adminClient
      .from('navbar_featured_cards')
      .delete()
      .in('navbar_item_id', existingItemIds)

    if (deleteFeaturedError) {
      return NextResponse.json({ error: deleteFeaturedError.message }, { status: 500 })
    }

    const { error: deleteItemsError } = await access.adminClient
      .from('navbar_items')
      .delete()
      .in('id', existingItemIds)

    if (deleteItemsError) {
      return NextResponse.json({ error: deleteItemsError.message }, { status: 500 })
    }
  }

  for (const [itemIndex, item] of itemsToSave.entries()) {
    const { data: insertedItem, error: insertItemError } = await access.adminClient
      .from('navbar_items')
      .insert({
        label: item.label,
        slug: item.slug,
        item_type: item.type === 'mega' ? 'mega_menu' : 'direct_link',
        linked_category_id: categoryBySlug.get(item.slug)?.id ?? item.linkedCategoryId ?? null,
        direct_link_url: item.type === 'direct' ? item.url ?? '/' : null,
        display_order: itemIndex + 1,
        status: item.visible ? 'active' : 'hidden',
      })
      .select('id')
      .single()

    if (insertItemError || !insertedItem) {
      return NextResponse.json({ error: insertItemError?.message ?? 'Failed to save navbar item.' }, { status: 500 })
    }

    if (item.type === 'mega') {
      for (const [sectionIndex, section] of (item.sections ?? []).entries()) {
        const sectionType = mapSectionTypeToDb(section.type)
        const sourceSubcategoryId = sectionType === 'category_list' ? section.sourceSubcategoryId : null
        const sourceCategorySlug = sectionType === 'category_link' ? section.sourceCategorySlug ?? null : null

        const { data: insertedSection, error: insertSectionError } = await access.adminClient
          .from('navbar_sections')
          .insert({
            navbar_item_id: insertedItem.id,
            title: section.title,
            icon_svg_path: section.iconSvgPath ?? null,
            section_type: sectionType,
            source_subcategory_id: sourceSubcategoryId,
            source_category_slug: sourceCategorySlug,
            enable_category_link: section.enableCategoryLink ?? false,
            linked_category_id: section.linkedCategoryId ?? null,
            column_number: section.column,
            show_as_filter: section.showAsFilter ?? false,
            display_order: sectionIndex + 1,
            status: item.visible ? 'active' : 'hidden',
          })
          .select('id')
          .single()

        if (insertSectionError || !insertedSection) {
          return NextResponse.json({ error: getNavbarSaveErrorMessage(insertSectionError) }, { status: 500 })
        }

        if ((section.selectedSourceItems?.length ?? 0) > 0) {
          const sourceItemRows = (section.selectedSourceItems ?? []).map((entry, entryIndex) => ({
            section_id: insertedSection.id,
            source_kind: entry.sourceKind,
            source_item_id: entry.sourceItemId,
            sort_order: entry.sortOrder || entryIndex + 1,
            is_active: entry.isActive,
          }))

          const { error: insertSourceItemsError } = await access.adminClient
            .from('navbar_section_source_items')
            .insert(sourceItemRows)

          if (insertSourceItemsError) {
            return NextResponse.json({ error: insertSourceItemsError.message }, { status: 500 })
          }
        }

        if (section.type === 'Manual Links' && section.links.length > 0) {
          const linkRows = section.links.map((link, linkIndex) => ({
            section_id: insertedSection.id,
            label: link.label,
            url: link.url,
            display_order: linkIndex + 1,
            status: item.visible ? 'active' : 'hidden',
          }))

          const { error: insertLinksError } = await access.adminClient
            .from('navbar_section_links')
            .insert(linkRows)

          if (insertLinksError) {
            return NextResponse.json({ error: insertLinksError.message }, { status: 500 })
          }
        }
      }

      const featuredImage = item.featuredImage ?? {
        enabled: false,
        imageUrl: '',
        buttonLabel: '',
        buttonUrl: '',
        imageAlt: item.label,
      }

      const { error: insertFeaturedError } = await access.adminClient
        .from('navbar_featured_cards')
        .insert({
          navbar_item_id: insertedItem.id,
          image_path: featuredImage.imageUrl || null,
          image_alt: featuredImage.imageAlt || item.label,
          button_label: featuredImage.buttonLabel || null,
          button_url: featuredImage.buttonUrl || null,
          enabled: featuredImage.enabled,
        })

      if (insertFeaturedError) {
        return NextResponse.json({ error: insertFeaturedError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true })
}
