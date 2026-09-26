import { NextResponse } from 'next/server'
import sharp from 'sharp'
import type { assertAdmin } from './cms-auth'
import { validateSafeSvg } from './admin-upload-validation'

type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>
type UploadConfig = {
  bucket: string
  maxBytes: number
  rasterWidth: number | ((form: FormData) => number)
  allowSvg?: boolean
  svgOnly?: boolean
  validateForm?: (form: FormData) => string | null
  buildPath: (extension: 'webp' | 'svg', form: FormData) => string
}

const rasterFormats = new Map<string, Set<string>>([
  ['image/jpeg', new Set(['jpeg'])],
  ['image/png', new Set(['png'])],
  ['image/webp', new Set(['webp'])],
  ['image/avif', new Set(['avif', 'heif'])],
])

export async function handleAdminImageUpload(request: Request, access: Access, config: UploadConfig) {
  const contentLength = Number(request.headers.get('content-length'))
  if (!Number.isFinite(contentLength) || contentLength <= 0) return NextResponse.json({ error: 'A valid upload size is required.' }, { status: 411 })
  if (contentLength > config.maxBytes + 1024 * 1024) return NextResponse.json({ error: 'The upload request is too large.' }, { status: 413 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!form || !(file instanceof File)) return NextResponse.json({ error: 'Missing image file.' }, { status: 400 })
  const formError = config.validateForm?.(form)
  if (formError) return NextResponse.json({ error: formError }, { status: 400 })
  if (file.size < 1 || file.size > config.maxBytes) return NextResponse.json({ error: `Images must be ${Math.floor(config.maxBytes / 1024 / 1024)} MB or smaller.` }, { status: file.size > 0 ? 413 : 400 })

  const input = Buffer.from(await file.arrayBuffer())
  let output: Buffer
  let extension: 'webp' | 'svg'
  let contentType: 'image/webp' | 'image/svg+xml'
  if (file.type === 'image/svg+xml') {
    if (!config.allowSvg || !validateSafeSvg(input)) return NextResponse.json({ error: config.allowSvg ? 'The SVG contains unsupported or unsafe content.' : 'SVG images are not allowed here.' }, { status: 400 })
    output = input
    extension = 'svg'
    contentType = 'image/svg+xml'
  } else {
    if (config.svgOnly) return NextResponse.json({ error: 'Only safe SVG files are allowed.' }, { status: 400 })
    const formats = rasterFormats.get(file.type)
    if (!formats) return NextResponse.json({ error: 'Only JPG, PNG, WebP, or AVIF images are allowed.' }, { status: 400 })
    try {
      const image = sharp(input, { failOn: 'warning', limitInputPixels: 40_000_000 })
      const metadata = await image.metadata()
      if (!metadata.format || !formats.has(metadata.format)) return NextResponse.json({ error: 'The file contents do not match the selected image type.' }, { status: 400 })
      const width = typeof config.rasterWidth === 'function' ? config.rasterWidth(form) : config.rasterWidth
      output = await image.rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
      extension = 'webp'
      contentType = 'image/webp'
    } catch {
      return NextResponse.json({ error: 'The uploaded file is not a valid supported image.' }, { status: 400 })
    }
  }

  const path = config.buildPath(extension, form)
  const { error } = await access.adminClient.storage.from(config.bucket).upload(path, output, { contentType, upsert: false, cacheControl: '31536000' })
  if (error) return NextResponse.json({ error: 'Unable to store the uploaded image.' }, { status: 500 })
  const { data } = access.adminClient.storage.from(config.bucket).getPublicUrl(path)
  return NextResponse.json({ path, url: data.publicUrl }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
