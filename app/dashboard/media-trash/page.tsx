import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { MediaTrashClient, type MediaSection } from './media-trash-client'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const PUBLIC_PREFIX = '/storage/v1/object/public/'
const R2_PUBLIC_BASE = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

type SectionSource = {
  key: string
  label: string
  table: string
  columns: string[]
}

const SECTION_SOURCES: SectionSource[] = [
  { key: 'products', label: 'Products', table: 'products', columns: ['image_1_path', 'image_2_path', 'image_3_path', 'image_4_path', 'video_path'] },
  { key: 'product-metal-media', label: 'Product Metal Media', table: 'product_metal_media', columns: ['image_1_path', 'image_2_path', 'image_3_path', 'image_4_path', 'video_path'] },
  { key: 'product-variant-media', label: 'Product Variant Media', table: 'product_variant_media_items', columns: ['media_path'] },
  { key: 'hero', label: 'Hero Slider', table: 'homepage_hero_slider_items', columns: ['image_path', 'mobile_image_path'] },
  { key: 'collection', label: 'Collection', table: 'collection_items', columns: ['image_path'] },
  { key: 'collection-page-config', label: 'Collection Page', table: 'collection_page_config', columns: ['showcase_image_path', 'showcase_mobile_image_path'] },
  { key: 'hiphop', label: 'Hip Hop Showcase', table: 'hiphop_showcase_section', columns: ['image_path'] },
  { key: 'hiphop-hero', label: 'Hip Hop Hero Slider', table: 'hiphop_hero_slider_items', columns: ['image_path', 'mobile_image_path'] },
  { key: 'couples', label: 'Couples', table: 'couples_items', columns: ['image_path'] },
  { key: 'certifications', label: 'Certifications', table: 'certifications_items', columns: ['icon_path'] },
  { key: 'material-strip', label: 'Material Strip', table: 'material_strip_items', columns: ['icon_path'] },
  { key: 'diamond-info', label: 'Video Highlights', table: 'diamond_info_config', columns: ['video_path', 'video_poster_path'] },
  { key: 'about-values', label: 'About Values', table: 'about_values', columns: ['icon_path'] },
  { key: 'contact-info', label: 'Contact Info', table: 'contact_info', columns: ['icon_path'] },
  { key: 'founders', label: 'Founders', table: 'about_founders', columns: ['image_path'] },
  { key: 'blog', label: 'Blog Posts', table: 'blog_posts', columns: ['hero_image_path'] },
  { key: 'blog-content-blocks', label: 'Blog Content Blocks', table: 'blog_post_content_blocks', columns: ['image_path'] },
  { key: 'bespoke-process', label: 'Bespoke Manufacturing', table: 'bespoke_process_steps', columns: ['image_path', 'media_path'] },
  { key: 'bespoke-hero', label: 'Bespoke Hero Slider', table: 'bespoke_hero_slider_items', columns: ['image_path', 'mobile_image_path'] },
  { key: 'bespoke-portfolio', label: 'Bespoke Portfolio', table: 'bespoke_portfolio_items', columns: ['media_path', 'thumbnail_path'] },
  { key: 'promotion-popup', label: 'Promotion Popup', table: 'promotion_popup', columns: ['image_path', 'mobile_image_path'] },
  { key: 'navbar-featured', label: 'Navbar Featured Cards', table: 'navbar_featured_cards', columns: ['image_path'] },
  { key: 'navbar-sections', label: 'Navbar Section Icons', table: 'navbar_sections', columns: ['icon_svg_path'] },
  { key: 'catalog-categories', label: 'Catalog Category Banners', table: 'catalog_categories', columns: ['banner_desktop_image_path', 'banner_mobile_image_path'] },
  { key: 'catalog-subcategories', label: 'Catalog Subcategory Icons', table: 'catalog_subcategories', columns: ['icon_svg_path'] },
  { key: 'catalog-options', label: 'Catalog Option Icons', table: 'catalog_options', columns: ['icon_svg_path'] },
  { key: 'catalog-stone-shapes', label: 'Catalog Stone Shapes', table: 'catalog_stone_shapes', columns: ['svg_asset_url'] },
  { key: 'catalog-styles', label: 'Catalog Styles', table: 'catalog_styles', columns: ['icon_svg_path'] },
  { key: 'category-grid-posters', label: 'Category Grid Posters', table: 'category_grid_posters', columns: ['image_path'] },
  { key: 'trusted-partners', label: 'Trusted Partners', table: 'home_trusted_partner_logos', columns: ['logo_path'] },
  { key: 'discover-shapes', label: 'Discover Shapes', table: 'discover_shapes_items', columns: ['image_path'] },
  { key: 'discover-rings', label: 'Discover Rings', table: 'discover_rings_items', columns: ['image_path'] },
  { key: 'diamond-info-features', label: 'Diamond Info Features', table: 'diamond_info_feature_items', columns: ['icon_svg'] },
]

type TrashRecord = {
  id: string
  path: string
  status: 'trashed' | 'restored' | 'deleted'
  trashed_at: string
  eligible_delete_at: string
}

function normalizePath(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const withoutHash = trimmed.split('#')[0] ?? trimmed
  const withoutQuery = withoutHash.split('?')[0] ?? withoutHash
  const normalizedInput = withoutQuery.trim()
  if (!normalizedInput) return null

  if (R2_PUBLIC_BASE && (normalizedInput.startsWith(`${R2_PUBLIC_BASE}/`) || normalizedInput === R2_PUBLIC_BASE)) {
    return decodeURIComponent(normalizedInput.slice(R2_PUBLIC_BASE.length).replace(/^\/+/, ''))
  }

  if (normalizedInput.startsWith('http://') || normalizedInput.startsWith('https://')) {
    let pathname = normalizedInput
    try {
      pathname = new URL(normalizedInput).pathname
    } catch {
      pathname = normalizedInput
    }

    const marker = `${PUBLIC_PREFIX}${collectionBucket}/`
    const index = pathname.indexOf(marker)
    if (index >= 0) {
      return decodeURIComponent(pathname.slice(index + marker.length))
    }
    return null
  }

  const rootRelativeMarker = `${PUBLIC_PREFIX}${collectionBucket}/`
  if (normalizedInput.startsWith(rootRelativeMarker)) {
    return decodeURIComponent(normalizedInput.slice(rootRelativeMarker.length))
  }

  const noLeadingSlashMarker = rootRelativeMarker.replace(/^\//, '')
  if (normalizedInput.startsWith(noLeadingSlashMarker)) {
    return decodeURIComponent(normalizedInput.slice(noLeadingSlashMarker.length))
  }

  if (normalizedInput.startsWith(`${collectionBucket}/`)) {
    return decodeURIComponent(normalizedInput.slice(collectionBucket.length + 1))
  }

  return decodeURIComponent(normalizedInput.replace(/^\/+/, ''))
}

async function listAllFiles(adminClient: any, folder = ''): Promise<Array<{ name: string; path: string }>> {
  const { data, error } = await adminClient.storage.from(collectionBucket).list(folder || undefined, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    throw new Error(error.message)
  }

  const results: Array<{ name: string; path: string }> = []

  for (const item of data ?? []) {
    const currentPath = folder ? `${folder}/${item.name}` : item.name
    if (item.id) {
      results.push({ name: item.name, path: currentPath })
    } else {
      const nested = await listAllFiles(adminClient, currentPath)
      results.push(...nested)
    }
  }

  return results
}

async function collectReferencedPaths(adminClient: any) {
  const referencedByPath = new Map<string, Set<string>>()

  for (const source of SECTION_SOURCES) {
    const { data, error } = await adminClient.from(source.table).select(source.columns.join(', '))
    if (error) {
      const isMissingRelation =
        error.code === 'PGRST205' ||
        error.message?.includes(`Could not find the table 'public.${source.table}'`)

      if (isMissingRelation) {
        continue
      }

      throw new Error(`${source.label}: ${error.message}`)
    }

    for (const row of data ?? []) {
      for (const column of source.columns) {
        const normalized = normalizePath(row[column])
        if (!normalized) continue
        const existing = referencedByPath.get(normalized) ?? new Set<string>()
        existing.add(source.label)
        referencedByPath.set(normalized, existing)
      }
    }
  }

  return referencedByPath
}

async function collectActiveTrashRecords(adminClient: any) {
  const { data, error } = await adminClient
    .from('media_trash')
    .select('id, path, status, trashed_at, eligible_delete_at')
    .eq('bucket', collectionBucket)
    .eq('status', 'trashed')

  if (error) {
    const isMissingRelation =
      error.code === 'PGRST205' ||
      error.message?.includes("Could not find the table 'public.media_trash'")

    if (isMissingRelation) return new Map<string, TrashRecord>()
    throw new Error(`Media Trash Ledger: ${error.message}`)
  }

  return new Map(
    ((data ?? []) as TrashRecord[])
      .map((record) => [record.path, record])
  )
}

function getSectionLabelForPath(path: string) {
  const topLevel = path.split('/')[0] || 'root'
  return topLevel.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

async function getInitialSections(): Promise<MediaSection[]> {
  const adminClient = createSupabaseAdminClient()
  const referencedByPath = await collectReferencedPaths(adminClient)
  const [files, trashedByPath] = await Promise.all([
    listAllFiles(adminClient),
    collectActiveTrashRecords(adminClient),
  ])
  const sectionsMap = new Map<string, MediaSection['items']>()

  for (const file of files) {
    const publicUrl = adminClient.storage.from(collectionBucket).getPublicUrl(file.path).data.publicUrl
    const references = Array.from(referencedByPath.get(file.path) ?? [])
    const sectionLabel = getSectionLabelForPath(file.path)
    const bucket = sectionsMap.get(sectionLabel) ?? []

    bucket.push({
      path: file.path,
      name: file.name,
      url: publicUrl,
      status: trashedByPath.has(file.path) ? 'trashed' : references.length > 0 ? 'used' : 'unused',
      referencedBy: trashedByPath.has(file.path) ? ['30-day trash'] : references,
      trashedAt: trashedByPath.get(file.path)?.trashed_at ?? null,
      eligibleDeleteAt: trashedByPath.get(file.path)?.eligible_delete_at ?? null,
    })

    sectionsMap.set(sectionLabel, bucket)
  }

  return Array.from(sectionsMap.entries())
    .map(([name, items]) => ({
      name,
      total: items.length,
      used: items.filter((item) => item.status === 'used').length,
      unused: items.filter((item) => item.status === 'unused').length,
      trashed: items.filter((item) => item.status === 'trashed').length,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export default async function MediaTrashPage() {
  const initialSections = await getInitialSections()
  return <MediaTrashClient initialSections={initialSections} />
}
