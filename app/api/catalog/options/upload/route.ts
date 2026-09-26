import { assertAdmin } from '@/lib/cms-auth'
import { handleAdminImageUpload } from '@/lib/admin-image-upload'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return handleAdminImageUpload(request, access, {
    bucket, maxBytes: 6 * 1024 * 1024, rasterWidth: 1200, allowSvg: true,
    buildPath: (extension) => `catalog/options/${crypto.randomUUID()}.${extension}`,
  })
}
