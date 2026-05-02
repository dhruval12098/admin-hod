import 'server-only'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type ProductMediaFolder = 'products' | 'hiphop'

const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim() ?? ''
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() ?? ''
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() ?? ''
const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET?.trim() ?? ''
const r2PublicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL?.trim() ?? ''
const r2VideoPrefix = process.env.CLOUDFLARE_R2_VIDEO_PREFIX?.trim() || 'products/videos'

let client: S3Client | null = null

function requireR2Config() {
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket || !r2PublicBaseUrl) {
    throw new Error('Cloudflare R2 video upload is not configured completely.')
  }
}

function getR2Client() {
  requireR2Config()
  if (client) return client

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  })

  return client
}

function normalizePrefix(value: string) {
  return value.split('/').map((part) => part.trim()).filter(Boolean).join('/')
}

function joinPublicUrl(baseUrl: string, key: string) {
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const cleanKey = key.replace(/^\/+/, '')
  return `${cleanBase}/${cleanKey}`
}

function buildVideoObjectKey(folder: ProductMediaFolder, extension: string) {
  const prefix = normalizePrefix(r2VideoPrefix)
  const keyParts = prefix ? [prefix] : []

  if (folder === 'hiphop') {
    keyParts.push('hiphop')
  }

  keyParts.push(`${crypto.randomUUID()}.${extension}`)

  return keyParts.join('/')
}

export function inferVideoContentType(extension: string, fallback?: string | null) {
  const normalized = extension.trim().toLowerCase()
  if (normalized === 'mov') return 'video/quicktime'
  if (normalized === 'webm') return 'video/webm'
  if (normalized === 'mp4') return 'video/mp4'
  return fallback?.trim() || 'video/mp4'
}

export async function uploadProductVideoToR2({
  buffer,
  extension,
  folder,
  contentType,
}: {
  buffer: Buffer
  extension: string
  folder: ProductMediaFolder
  contentType?: string | null
}) {
  const safeExtension = extension.trim().toLowerCase() || 'mp4'
  const objectKey = buildVideoObjectKey(folder, safeExtension)

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: inferVideoContentType(safeExtension, contentType),
    }),
  )

  return {
    key: objectKey,
    url: joinPublicUrl(r2PublicBaseUrl, objectKey),
  }
}
