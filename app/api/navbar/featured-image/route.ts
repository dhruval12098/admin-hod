import { assertAdmin } from '@/lib/cms-auth'
import { handleAdminImageUpload } from '@/lib/admin-image-upload'

const bucket = process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod'

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  return handleAdminImageUpload(request, access, {
    bucket, maxBytes: 8 * 1024 * 1024, rasterWidth: 1800,
    buildPath: () => `navbar/featured/${crypto.randomUUID()}.webp`,
  })
}
