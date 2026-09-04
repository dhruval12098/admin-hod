'use client'

export type DocsAdminPayload = {
  page?: { eyebrow?: string; title?: string; subtitle?: string } | null
  blocks?: Array<{ id?: number; sort_order: number; heading: string; description: string; body: string }>
  error?: string
}

type CacheEntry = { payload: DocsAdminPayload; cachedAt: number }

const CACHE_TTL_MS = 60_000
const memoryCache = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, Promise<DocsAdminPayload>>()

export function getCachedDocsPage(slug: string): DocsAdminPayload | null {
  const memoryEntry = memoryCache.get(slug)
  if (memoryEntry && Date.now() - memoryEntry.cachedAt < CACHE_TTL_MS) return memoryEntry.payload
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
