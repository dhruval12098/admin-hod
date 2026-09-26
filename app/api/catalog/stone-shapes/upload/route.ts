import { assertAdmin } from '@/lib/cms-auth'
import { handleAdminImageUpload } from '@/lib/admin-image-upload'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return handleAdminImageUpload(request, access, {
    bucket, maxBytes: 1024 * 1024, rasterWidth: 512, allowSvg: true, svgOnly: true,
    buildPath: () => `catalog/stone-shapes/${crypto.randomUUID()}.svg`,
  })
}
