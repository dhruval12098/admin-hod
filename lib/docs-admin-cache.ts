'use client'

export type DocsAdminPayload = {
  page?: { id?: number; slug?: string; eyebrow?: string; title?: string; subtitle?: string; faq_category_id?: number | null } | null
  blocks?: Array<{ id?: number; sort_order: number; heading: string; description: string; body: string }>
  faqCategories?: Array<{ id: number; name: string; slug: string; image_path?: string | null; image_alt?: string; is_active: boolean }>
  revision?: string
  error?: string
}

type CacheEntry = { payload: DocsAdminPayload; cachedAt: number }

const CACHE_TTL_MS = 60_000
const memoryCache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, Promise<DocsAdminPayload>>()

export function getCachedDocsPage(slug: string): DocsAdminPayload | null {
  const memoryEntry = memoryCache.get(slug)
  if (memoryEntry && Date.now() - memoryEntry.cachedAt < CACHE_TTL_MS && /^[a-f0-9]{32}$/.test(memoryEntry.payload.revision ?? '')) {
    return memoryEntry.payload
  }
  if (memoryEntry) memoryCache.delete(slug)
  return null
}

export function setCachedDocsPage(slug: string, payload: DocsAdminPayload) {
  const entry = { payload, cachedAt: Date.now() }
  memoryCache.set(slug, entry)
}

export function loadDocsPage(slug: string): Promise<DocsAdminPayload> {
  const cached = getCachedDocsPage(slug)
  if (cached) return Promise.resolve(cached)

  const pending = pendingRequests.get(slug)
  if (pending) return pending

  const request = fetch(`/api/cms/docs/${slug}`, { cache: 'no-store' })
    .then(async (response) => {
      const payload = (await response.json().catch(() => null)) as DocsAdminPayload | null
      if (!response.ok) throw new Error(payload?.error ?? 'Unable to load docs page.')
      const resolved = payload ?? { page: null, blocks: [] }
      setCachedDocsPage(slug, resolved)
      return resolved
    })
    .finally(() => pendingRequests.delete(slug))

  pendingRequests.set(slug, request)
  return request
}
