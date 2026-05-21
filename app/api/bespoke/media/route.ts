import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { uploadProductVideoToR2 } from '@/lib/r2'

const allowedVideoMimeTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const maxVideoSizeBytes = 20 * 1024 * 1024

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  const kind = formData?.get('kind')

  if (!(file instanceof File) || kind !== 'video') {
    return NextResponse.json({ error: 'Invalid media upload request.' }, { status: 400 })
  }

  if (!allowedVideoMimeTypes.has(file.type)) {
    return NextResponse.json({ error: 'Only MP4, MOV, or WEBM videos are allowed.' }, { status: 400 })
  }

  if (file.size > maxVideoSizeBytes) {
    return NextResponse.json({ error: 'Video too large. Max size is 20MB. Use a direct URL for larger media.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : ''
  const safeVideoExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : 'mp4'

  try {
    const uploadedVideo = await uploadProductVideoToR2({
      buffer,
      extension: safeVideoExtension,
      folder: 'bespoke',
      contentType: file.type || 'video/mp4',
    })

    return NextResponse.json({
      path: uploadedVideo.url,
      url: uploadedVideo.url,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to upload the video to Cloudflare R2.',
      },
      { status: 500 },
    )
  }
}
