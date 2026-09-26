import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildFallbackNavbarItems,
  buildNavbarItemsFromRows,
  syncNavbarItemsWithCatalog,
  type NavbarBuilderPayload,
} from './navbar'
import type { CatalogCategory } from './product-catalog'

type Snapshot = {
  items: Parameters<typeof buildNavbarItemsFromRows>[0]['items']
  sections: Parameters<typeof buildNavbarItemsFromRows>[0]['sections']
  links: Parameters<typeof buildNavbarItemsFromRows>[0]['sectionLinks']
  source_items: Parameters<typeof buildNavbarItemsFromRows>[0]['sectionSourceItems']
  featured_cards: Parameters<typeof buildNavbarItemsFromRows>[0]['featuredCards']
  revision: string
}

export async function loadNavbarBuilderData(client: SupabaseClient): Promise<NavbarBuilderPayload> {
  const [categoriesResult, subcategoriesResult, optionsResult, metalsResult, stoneShapesResult, ringSizesResult, certificatesResult, stylesResult, snapshotResult] = await Promise.all([
    client.from('catalog_categories').select('*').order('display_order', { ascending: true }),
    client.from('catalog_subcategories').select('*').order('display_order', { ascending: true }),
    client.from('catalog_options').select('*').order('display_order', { ascending: true }),
    client.from('catalog_metals').select('*').order('display_order', { ascending: true }),
    client.from('catalog_stone_shapes').select('*').order('display_order', { ascending: true }),
    client.from('catalog_ring_sizes').select('*').order('display_order', { ascending: true }),
    client.from('catalog_certificates').select('*').order('display_order', { ascending: true }),
    client.from('catalog_styles').select('*').order('display_order', { ascending: true }),
    client.rpc('navbar_snapshot_v1'),
  ])

  const error = categoriesResult.error || subcategoriesResult.error || optionsResult.error || metalsResult.error || stoneShapesResult.error || ringSizesResult.error || certificatesResult.error || stylesResult.error || snapshotResult.error
  if (error) {
    if (snapshotResult.error?.code === 'PGRST202' || snapshotResult.error?.code === '42883') throw new Error('The navbar editor is awaiting its database migration.')
    throw new Error('Unable to load the navbar editor.')
  }

  const categories = (categoriesResult.data ?? []) as CatalogCategory[]
  const subcategories = subcategoriesResult.data ?? []
  const options = optionsResult.data ?? []
  const metals = metalsResult.data ?? []
  const stoneShapes = stoneShapesResult.data ?? []
  const ringSizes = ringSizesResult.data ?? []
  const certificates = certificatesResult.data ?? []
  const styles = stylesResult.data ?? []
  const snapshot = snapshotResult.data as Snapshot
  const builtItems = snapshot.items.length
    ? buildNavbarItemsFromRows({
        items: snapshot.items,
        sections: snapshot.sections,
        sectionLinks: snapshot.links,
        sectionSourceItems: snapshot.source_items,
        featuredCards: snapshot.featured_cards,
        categories,
        subcategories,
        options,
        metals,
        stoneShapes,
        ringSizes,
        certificates,
        styles,
      })
    : buildFallbackNavbarItems(categories, subcategories, options)

  return {
    revision: snapshot.revision,
    items: syncNavbarItemsWithCatalog(builtItems, categories, subcategories, options),
    categories,
    subcategories,
    options,
    metals,
    stoneShapes,
    ringSizes,
    certificates,
    styles,
  }
}
