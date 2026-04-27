import { supabase } from '@/lib/supabase'

export type CoupleSection = {
  section_key: string
  eyebrow: string
  heading: string
  subtitle: string
}

export type CoupleItem = {
  clientId: string
  id?: number
  sort_order: number
  names: string
  location: string
  story: string
  product_name: string
  product_link: string
  product_detail: string
  image_path: string
}

type CouplesPayload = {
  section?: CoupleSection
  items?: Array<{
    id: number
    sort_order: number
    names: string
    location: string
    story: string
    product_name: string
    product_link: string
    product_detail: string
    image_path: string
  }>
  error?: string
}

export const defaultCoupleSection: CoupleSection = {
  section_key: 'home_couples',
  eyebrow: 'Love Stories',
  heading: 'Our Cute Couples',
  subtitle: 'Real couples. Real proposals. Real diamonds. Every ring tells a story.',
}

export function emptyCouple(sortOrder: number): CoupleItem {
  return {
    clientId: `draft-${Date.now()}`,
    sort_order: sortOrder,
    names: '',
    location: '',
    story: '',
    product_name: '',
    product_link: '',
    product_detail: '',
    image_path: '',
  }
}

export async function getAdminAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function loadCouples() {
  const token = await getAdminAccessToken()
  if (!token) return { error: 'You are not signed in.' } as const

  const response = await fetch('/api/cms/home/couples', {
    headers: { authorization: `Bearer ${token}` },
  })
  const payload = (await response.json().catch(() => null)) as CouplesPayload | null

  if (!response.ok) {
    return { error: payload?.error ?? 'Unable to load couples.' } as const
  }

  return {
    section: payload?.section ?? defaultCoupleSection,
    items: (payload?.items ?? []).map((item) => ({
      clientId: `id-${item.id}`,
      id: item.id,
      sort_order: Number(item.sort_order ?? 0),
      names: item.names ?? '',
      location: item.location ?? '',
      story: item.story ?? '',
      product_name: item.product_name ?? '',
      product_link: item.product_link ?? '',
      product_detail: item.product_detail ?? '',
      image_path: item.image_path ?? '',
    })),
  } as const
}

export async function saveCouples(section: Omit<CoupleSection, 'section_key'>, items: CoupleItem[]) {
  const token = await getAdminAccessToken()
  if (!token) return { error: 'You are not signed in.' } as const

  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId))
  const response = await fetch('/api/cms/home/couples', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      section,
      items: sortedItems.map(({ sort_order, names, location, story, product_name, product_link, product_detail, image_path }) => ({
        sort_order,
        names,
        location,
        story,
        product_name,
        product_link,
        product_detail,
        image_path,
      })),
    }),
  })

  const payload = (await response.json().catch(() => null)) as CouplesPayload | null
  if (!response.ok) {
    return { error: payload?.error ?? 'Unable to save couples.' } as const
  }

  return { ok: true } as const
}

export async function uploadCoupleImage(file: File) {
  const token = await getAdminAccessToken()
  if (!token) return { error: 'You are not signed in.' } as const

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/cms/uploads/couples', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as { path?: string; error?: string } | null
  if (!response.ok || !payload?.path) {
    return { error: payload?.error ?? 'Unable to upload image.' } as const
  }

  return { path: payload.path } as const
}
