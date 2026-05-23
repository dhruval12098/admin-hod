import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

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
]

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

function getSectionLabelForPath(path: string) {
  const topLevel = path.split('/')[0] || 'root'
  const pretty = topLevel
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  return pretty
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  try {
    const referencedByPath = await collectReferencedPaths(access.adminClient)
    const files = await listAllFiles(access.adminClient)
    const sectionsMap = new Map<
      string,
      Array<{
        path: string
        name: string
        url: string
        status: 'used' | 'unused'
        referencedBy: string[]
      }>
    >()

    for (const file of files) {
      const publicUrl = access.adminClient.storage.from(collectionBucket).getPublicUrl(file.path).data.publicUrl
      const references = Array.from(referencedByPath.get(file.path) ?? [])
      const sectionLabel = getSectionLabelForPath(file.path)
      const bucket = sectionsMap.get(sectionLabel) ?? []

      bucket.push({
        path: file.path,
        name: file.name,
        url: publicUrl,
        status: references.length > 0 ? 'used' : 'unused',
        referencedBy: references,
      })

      sectionsMap.set(sectionLabel, bucket)
    }

    const sections = Array.from(sectionsMap.entries())
      .map(([name, items]) => ({
        name,
        total: items.length,
        used: items.filter((item) => item.status === 'used').length,
        unused: items.filter((item) => item.status === 'unused').length,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ sections })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to scan storage bucket.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  const paths = Array.isArray(body?.paths)
    ? body.paths.map(normalizePath).filter((value): value is string => Boolean(value))
    : []
  const singlePath = normalizePath(body?.path)
  const normalizedPaths = paths.length > 0 ? [...new Set(paths)] : singlePath ? [singlePath] : []

  if (normalizedPaths.length === 0) {
    return NextResponse.json({ error: 'Missing file path.' }, { status: 400 })
  }

  try {
    const referencedByPath = await collectReferencedPaths(access.adminClient)
    const blockedPath = normalizedPaths.find((path) => referencedByPath.has(path))
    if (blockedPath) {
      return NextResponse.json({ error: 'One or more selected files are still marked as used and cannot be deleted.' }, { status: 400 })
    }

    const { error } = await access.adminClient.storage.from(collectionBucket).remove(normalizedPaths)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedCount: normalizedPaths.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete file.' },
      { status: 500 }
    )
  }
}
