import { assertAdmin } from '@/lib/cms-auth'
import { handleAdminImageUpload } from '@/lib/admin-image-upload'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'
const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return handleAdminImageUpload(request, access, {
    bucket, maxBytes: 6 * 1024 * 1024, rasterWidth: (form) => form.get('variant') === 'mobile' ? 1400 : 2400, allowSvg: true,
    validateForm: (form) => {
      const slug = form.get('slug')
      const variant = form.get('variant')
      if (typeof slug !== 'string' || !normalizeSlug(slug) || normalizeSlug(slug).length > 120) return 'A valid category slug is required.'
      if (variant !== 'desktop' && variant !== 'mobile') return 'A valid banner variant is required.'
      return null
    },
    buildPath: (extension, form) => `category-banners/${normalizeSlug(String(form.get('slug')))}/${form.get('variant')}-${crypto.randomUUID()}.${extension}`,
  })
}
