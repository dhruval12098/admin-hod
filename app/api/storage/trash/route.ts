import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const collectionBucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const PUBLIC_PREFIX = '/storage/v1/object/public/'

type SectionSource = {
  key: string
  label: string
  table: string
  columns: string[]
}

const SECTION_SOURCES: SectionSource[] = [
  { key: 'products', label: 'Products', table: 'products', columns: ['image_1_path', 'image_2_path', 'image_3_path', 'image_4_path', 'video_path'] },
  { key: 'hero', label: 'Hero Slider', table: 'homepage_hero_slider_items', columns: ['image_path'] },
  { key: 'collection', label: 'Collection', table: 'homepage_collection_items', columns: ['image_path'] },
  { key: 'hiphop', label: 'Hip Hop Showcase', table: 'cms_home_hiphop_showcase', columns: ['image_path'] },
  { key: 'couples', label: 'Couples', table: 'cms_home_couples_items', columns: ['image_path'] },
  { key: 'certifications', label: 'Certifications', table: 'cms_home_certifications_items', columns: ['icon_path'] },
  { key: 'material-strip', label: 'Material Strip', table: 'cms_home_material_strip_items', columns: ['icon_path'] },
  { key: 'about-values', label: 'About Values', table: 'about_values', columns: ['icon_path'] },
  { key: 'contact-info', label: 'Contact Info', table: 'contact_info', columns: ['icon_path'] },
  { key: 'founders', label: 'Founders', table: 'about_founders', columns: ['image_path'] },
  { key: 'blog', label: 'Blog Posts', table: 'blog_posts', columns: ['hero_image_path'] },
  { key: 'bespoke-process', label: 'Bespoke Manufacturing', table: 'bespoke_process_steps', columns: ['image_path'] },
  { key: 'navbar-featured', label: 'Navbar Featured Cards', table: 'navbar_featured_cards', columns: ['image_path'] },
]

function normalizePath(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const marker = `${PUBLIC_PREFIX}${collectionBucket}/`
    const index = trimmed.indexOf(marker)
    if (index >= 0) {
      return decodeURIComponent(trimmed.slice(index + marker.length))
    }
    return null
  }

  return trimmed.replace(/^\/+/, '')
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
  const path = normalizePath(body?.path)

  if (!path) {
    return NextResponse.json({ error: 'Missing file path.' }, { status: 400 })
  }

  try {
    const referencedByPath = await collectReferencedPaths(access.adminClient)
    if (referencedByPath.has(path)) {
      return NextResponse.json({ error: 'This file is still marked as used and cannot be deleted.' }, { status: 400 })
    }

    const { error } = await access.adminClient.storage.from(collectionBucket).remove([path])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete file.' },
      { status: 500 }
    )
  }
}
