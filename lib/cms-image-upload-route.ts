import { assertAdmin } from '@/lib/cms-auth'
import { handleAdminImageUpload } from '@/lib/admin-image-upload'

type CmsImageUploadConfig = {
  prefix: string
  maxBytes: number
  width: number
  allowSvg?: boolean
  svgOnly?: boolean
}

export async function handleCmsImageUpload(request: Request, config: CmsImageUploadConfig) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  return handleAdminImageUpload(request, access, {
    bucket: process.env.SUPABASE_COLLECTION_BUCKET ?? 'hod',
    maxBytes: config.maxBytes,
    rasterWidth: config.width,
    preserveAspectRatio: true,
    allowSvg: config.allowSvg,
    svgOnly: config.svgOnly,
    buildPath: (extension) => `${config.prefix}/${crypto.randomUUID()}.${extension}`,
  })
}
