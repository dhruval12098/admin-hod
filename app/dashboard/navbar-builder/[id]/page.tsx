import { NavbarItemEditor } from '@/components/navbar-builder-editor'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  buildFallbackNavbarItems,
  buildNavbarItemsFromRows,
  syncNavbarItemsWithCatalog,
  type NavbarBuilderPayload,
} from '@/lib/navbar'

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
    throw new Error(error.message)
  }

  return {
    categories: categoriesResult.data ?? [],
    subcategories: subcategoriesResult.data ?? [],
    options: optionsResult.data ?? [],
    metals: metalsResult.data ?? [],
    stoneShapes: stoneShapesResult.data ?? [],
    certificates: certificatesResult.error ? [] : certificatesResult.data ?? [],
    styles: stylesResult.error ? [] : stylesResult.data ?? [],
  }
}

async function getNavbarBuilderData(): Promise<NavbarBuilderPayload> {
  const adminClient = createSupabaseAdminClient()
  const sources = await loadCatalogSources(adminClient)

  const [itemsResult, sectionsResult, linksResult, sourceItemsResult, featuredResult] = await Promise.all([
    adminClient.from('navbar_items').select('*').order('display_order', { ascending: true }),
    adminClient.from('navbar_sections').select('*').order('column_number', { ascending: true }).order('display_order', { ascending: true }),
    adminClient.from('navbar_section_links').select('*').order('display_order', { ascending: true }),
    adminClient.from('navbar_section_source_items').select('*').order('sort_order', { ascending: true }),
    adminClient.from('navbar_featured_cards').select('*'),
  ])

  const error =
    itemsResult.error ||
    sectionsResult.error ||
    linksResult.error ||
    sourceItemsResult.error ||
    featuredResult.error

  if (error) {
    throw new Error(error.message)
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

  return {
    items: syncNavbarItemsWithCatalog(builtItems, sources.categories, sources.subcategories),
    categories: sources.categories,
    subcategories: sources.subcategories,
    options: sources.options,
    metals: sources.metals,
    stoneShapes: sources.stoneShapes,
    certificates: sources.certificates,
    styles: sources.styles,
  }
}

export default async function NavbarBuilderItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const initialData = await getNavbarBuilderData()

  return <NavbarItemEditor itemId={id} initialData={initialData} />
}
