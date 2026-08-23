'use client'

import Link from 'next/link'
import { useMemo, useState, type ChangeEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Edit2, Loader2, Plus, Trash2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { uploadCmsAssetDirectWithFallback } from '@/lib/cms-direct-upload-client'

type DiamondInfoFeatureItem = {
  id?: string
  sort_order: number
  icon_svg: string
  title: string
  description: string
  is_active: boolean
}

type DiamondInfoConfig = {
  video_enabled: boolean
  video_path: string
  video_poster_path: string
  layout_mode: string
  eyebrow: string
  section_heading: string
  section_subtext: string
  cta_label: string
  cta_link: string
}

type ApiPayload = {
  features?: DiamondInfoFeatureItem[]
  config?: DiamondInfoConfig
  error?: string
}

export type DiamondInfoInitialData = {
  features: DiamondInfoFeatureItem[]
  config: DiamondInfoConfig
}

function toPublicUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_COLLECTION_BUCKET || 'hod'
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return projectUrl ? `${projectUrl}/storage/v1/object/public/${bucket}/${path}` : path
}

function isSvgMarkup(value: string) {
  return value.trim().startsWith('<svg')
}

function createFeature(sortOrder: number): DiamondInfoFeatureItem {
  return {
    sort_order: sortOrder,
    icon_svg: '',
    title: '',
    description: '',
    is_active: true,
  }
}

function normalizeFeatures(features: DiamondInfoFeatureItem[]) {
  return features.map((feature, index) => ({
    ...feature,
    sort_order: index + 1,
  }))
}

export function DiamondInfoEditorClient({ initialData }: { initialData: DiamondInfoInitialData }) {
  const { toast } = useToast()
  const [features, setFeatures] = useState<DiamondInfoFeatureItem[]>(
    initialData.features.length ? normalizeFeatures(initialData.features) : [createFeature(1), createFeature(2), createFeature(3), createFeature(4)]
  )
  const [config, setConfig] = useState<DiamondInfoConfig>(initialData.config)
  const [loadStatus, setLoadStatus] = useState('Video Highlights ready')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [isUploadingPoster, setIsUploadingPoster] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorIndex, setEditorIndex] = useState<number | null>(null)
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('edit')
  const [editorItem, setEditorItem] = useState<DiamondInfoFeatureItem>(createFeature(1))
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)

  const videoPreviewUrl = toPublicUrl(config.video_path)
  const posterPreviewUrl = toPublicUrl(config.video_poster_path)
  const editorIconPreview = useMemo(
    () => (isSvgMarkup(editorItem.icon_svg) ? '' : toPublicUrl(editorItem.icon_svg)),
    [editorItem.icon_svg]
  )

  const withSessionToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      toast({
        title: 'Sign in required',
        description: 'Please sign in again before saving.',
        variant: 'destructive',
      })
      return null
    }

    return accessToken
  }

  const persist = async (
    nextFeatures: DiamondInfoFeatureItem[],
    nextConfig: DiamondInfoConfig,
    statusLabel: string,
    successMessage: string
  ) => {
    const accessToken = await withSessionToken()
    if (!accessToken) return false

    setIsSaving(true)
    setLoadStatus(statusLabel)

    const response = await fetch('/api/cms/home/diamond-info', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        features: normalizeFeatures(nextFeatures),
        config: nextConfig,
      }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Video Highlights.')
      toast({
        title: 'Save failed',
        description: payload?.error ?? 'Unable to save Video Highlights.',
        variant: 'destructive',
      })
      return false
    }

    setLoadStatus('Video Highlights saved')
    toast({
      title: 'Saved',
      description: successMessage,
    })
    return true
  }

  const saveAll = async () => {
    const nextFeatures = normalizeFeatures(features)
    setFeatures(nextFeatures)
    await persist(nextFeatures, config, 'Saving Video Highlights...', 'Video Highlights updated successfully.')
  }

  const uploadAsset = async (event: ChangeEvent<HTMLInputElement>, kind: 'video' | 'poster' | 'icon') => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const accessToken = await withSessionToken()
    if (!accessToken) return

    if (kind === 'video') {
      setIsUploadingVideo(true)
      setLoadStatus('Uploading section video...')
    } else if (kind === 'poster') {
      setIsUploadingPoster(true)
      setLoadStatus('Uploading poster image...')
    } else {
      setIsUploadingIcon(true)
      setLoadStatus('Uploading feature icon...')
    }

    let uploadedPath = ''
    try {
      const settings = kind === 'video'
        ? {
            maxInputBytes: 100 * 1024 * 1024,
            allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
          }
        : kind === 'poster'
          ? {
              maxInputBytes: 5 * 1024 * 1024,
              rasterWidth: 2200,
              webpQuality: 84,
              rasterOnly: true,
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
            }
          : {
              maxInputBytes: 512 * 1024,
              svgOnly: true,
              allowedMimeTypes: ['image/svg+xml'],
            }

      uploadedPath = await uploadCmsAssetDirectWithFallback({
        file,
        accessToken,
        signEndpoint: '/api/cms/uploads/diamond-info/sign',
        fallbackEndpoint: '/api/cms/uploads/diamond-info',
        ...settings,
        signFields: { kind, declaredSize: file.size },
        fallbackFields: { kind },
      })
    } catch (error) {
      if (kind === 'video') setIsUploadingVideo(false)
      if (kind === 'poster') setIsUploadingPoster(false)
      if (kind === 'icon') setIsUploadingIcon(false)
      const message = error instanceof Error ? error.message : 'Upload failed.'
      setLoadStatus(message)
      toast({ title: 'Upload failed', description: message, variant: 'destructive' })
      return
    }

    if (kind === 'video') setIsUploadingVideo(false)
    if (kind === 'poster') setIsUploadingPoster(false)
    if (kind === 'icon') setIsUploadingIcon(false)

    if (kind === 'icon') {
      setEditorItem((prev) => ({ ...prev, icon_svg: uploadedPath }))
      setLoadStatus('Feature icon uploaded. Save the popup changes to keep it.')
      toast({
        title: 'Icon uploaded',
        description: 'SVG uploaded to the diamond-info/icons folder.',
      })
      return
    }

    const nextConfig = {
      ...config,
      video_enabled: true,
      [kind === 'video' ? 'video_path' : 'video_poster_path']: uploadedPath,
    }
    setConfig(nextConfig)
    await persist(
      features,
      nextConfig,
      kind === 'video' ? 'Saving uploaded video...' : 'Saving uploaded poster...',
      kind === 'video' ? 'Section video uploaded successfully.' : 'Poster image uploaded successfully.'
    )
  }

  const openAddDialog = () => {
    setEditorMode('add')
    setEditorIndex(null)
    setEditorItem(createFeature(features.length + 1))
    setEditorOpen(true)
  }

  const openEditDialog = (index: number) => {
    setEditorMode('edit')
    setEditorIndex(index)
    setEditorItem({ ...features[index] })
    setEditorOpen(true)
  }

  const saveEditor = () => {
    const cleaned = {
      ...editorItem,
      title: editorItem.title.trim(),
      description: editorItem.description.trim(),
      icon_svg: editorItem.icon_svg.trim(),
    }

    if (!cleaned.title) {
      toast({
        title: 'Title required',
        description: 'Please add a title for this feature point.',
        variant: 'destructive',
      })
      return
    }

    const nextFeatures =
      editorMode === 'add'
        ? normalizeFeatures([...features, cleaned])
        : normalizeFeatures(
            features.map((feature, index) => (index === editorIndex ? cleaned : feature))
          )

    setFeatures(nextFeatures)
    setEditorOpen(false)
    setLoadStatus('Feature updated locally. Save Video Highlights to publish.')
    toast({
      title: editorMode === 'add' ? 'Feature added' : 'Feature updated',
      description: 'Save Video Highlights to publish this change on the live site.',
    })
  }

  const removeFeature = (index: number) => {
    const next = features.filter((_, featureIndex) => featureIndex !== index)
    setFeatures(next.length ? normalizeFeatures(next) : [createFeature(1)])
    setLoadStatus('Feature removed locally. Save Video Highlights to publish.')
    toast({
      title: 'Feature removed',
      description: 'Save Video Highlights to publish this change on the live site.',
    })
  }

  const moveFeature = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= features.length) return

    const next = [...features]
    const [item] = next.splice(index, 1)
    next.splice(targetIndex, 0, item)
    setFeatures(normalizeFeatures(next))
    setLoadStatus('Feature order updated locally. Save Video Highlights to publish.')
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/dashboard/cms/home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
          Save Video Highlights
        </button>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Video Highlights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the homepage split section with video, heading, CTA, and feature points.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,420px)]">
        <div className="space-y-8">
          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Section Content</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep this focused: one video, one strong heading, supporting copy, and a clean CTA.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
                <input
                  type="text"
                  value={config.eyebrow}
                  onChange={(event) => setConfig((prev) => ({ ...prev, eyebrow: event.target.value }))}
                  placeholder="Learn about the difference"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">CTA label</label>
                <input
                  type="text"
                  value={config.cta_label}
                  onChange={(event) => setConfig((prev) => ({ ...prev, cta_label: event.target.value }))}
                  placeholder="Learn about our peace of mind guarantee"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-foreground">Section heading</label>
                <textarea
                  value={config.section_heading}
                  onChange={(event) => setConfig((prev) => ({ ...prev, section_heading: event.target.value }))}
                  rows={3}
                  placeholder="This is the future of jewelry buying."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-foreground">Section copy</label>
                <textarea
                  value={config.section_subtext}
                  onChange={(event) => setConfig((prev) => ({ ...prev, section_subtext: event.target.value }))}
                  rows={4}
                  placeholder="We didn’t say that. Our customers did."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-foreground">CTA link</label>
                <input
                  type="text"
                  value={config.cta_link}
                  onChange={(event) => setConfig((prev) => ({ ...prev, cta_link: event.target.value }))}
                  placeholder="/contact"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Feature Points</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Manage the icon, title, and description cards shown beside the video.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddDialog}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <Plus size={16} />
                Add feature
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Icon</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => {
                    const iconIsSvg = isSvgMarkup(feature.icon_svg)
                    const iconUrl = iconIsSvg ? '' : toPublicUrl(feature.icon_svg)

                    return (
                      <tr key={feature.id ?? `feature-${index}`} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-4 text-sm text-foreground">{feature.sort_order}</td>
                        <td className="px-4 py-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-[#0A1628]">
                            {feature.icon_svg ? (
                              iconIsSvg ? (
                                <span
                                  className="block h-5 w-5 [&>svg]:h-5 [&>svg]:w-5"
                                  dangerouslySetInnerHTML={{ __html: feature.icon_svg }}
                                />
                              ) : (
                                <img src={iconUrl} alt={feature.title || 'Feature icon'} className="h-5 w-5 object-contain" />
                              )
                            ) : (
                              <span className="text-[10px] text-muted-foreground">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-foreground">{feature.title || 'Untitled feature'}</div>
                          <div className="mt-1 max-w-[320px] truncate text-xs text-muted-foreground">
                            {feature.description || 'No description added yet'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          {feature.is_active ? 'Visible' : 'Hidden'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => moveFeature(index, -1)}
                              disabled={index === 0}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFeature(index, 1)}
                              disabled={index === features.length - 1}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditDialog(index)}
                              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFeature(index)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-destructive transition-colors hover:bg-destructive/10"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Video Source</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use a direct public URL or upload into storage. The storefront will prefer whatever is saved here.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Video URL or storage path</label>
                <input
                  type="text"
                  value={config.video_path}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      video_enabled: true,
                      video_path: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Poster URL or storage path</label>
                <input
                  type="text"
                  value={config.video_poster_path}
                  onChange={(event) => setConfig((prev) => ({ ...prev, video_poster_path: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                {isUploadingVideo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isUploadingVideo ? 'Uploading video...' : 'Upload video'}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => void uploadAsset(event, 'video')} />
              </label>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                {isUploadingPoster ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isUploadingPoster ? 'Uploading poster...' : 'Upload poster'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => void uploadAsset(event, 'poster')} />
              </label>
            </div>

            <div className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-black/90">
                {videoPreviewUrl ? (
                  <video
                    src={videoPreviewUrl}
                    poster={posterPreviewUrl || undefined}
                    controls
                    muted
                    playsInline
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm text-white/70">
                    Add a video URL or upload a video to preview the section.
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10">
                {posterPreviewUrl ? (
                  <img src={posterPreviewUrl} alt="Section poster preview" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                    Poster preview will appear here if you add one.
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editorMode === 'add' ? 'Add Feature Point' : 'Edit Feature Point'}</DialogTitle>
            <DialogDescription>
              Upload an SVG into the dedicated icon folder, or paste inline SVG markup directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Icon</label>
              <div className="rounded-2xl border border-border bg-secondary/10 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white text-[#0A1628]">
                    {editorItem.icon_svg ? (
                      isSvgMarkup(editorItem.icon_svg) ? (
                        <span
                          className="block h-8 w-8 [&>svg]:h-8 [&>svg]:w-8"
                          dangerouslySetInnerHTML={{ __html: editorItem.icon_svg }}
                        />
                      ) : (
                        <img src={editorIconPreview} alt="Feature icon preview" className="h-8 w-8 object-contain" />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">No icon</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                      {isUploadingIcon ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {isUploadingIcon ? 'Uploading...' : 'Upload SVG'}
                      <input
                        type="file"
                        accept=".svg,image/svg+xml"
                        className="hidden"
                        onChange={(event) => void uploadAsset(event, 'icon')}
                      />
                    </label>

                    {editorItem.icon_svg ? (
                      <button
                        type="button"
                        onClick={() => setEditorItem((prev) => ({ ...prev, icon_svg: '' }))}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                      >
                        <Trash2 size={14} />
                        Clear icon
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    SVG markup or uploaded path
                  </label>
                  <textarea
                    value={editorItem.icon_svg}
                    onChange={(event) => setEditorItem((prev) => ({ ...prev, icon_svg: event.target.value }))}
                    rows={5}
                    placeholder="<svg viewBox='0 0 24 24' ...></svg> or diamond-info/icons/your-file.svg"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 font-mono text-xs transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
              <input
                value={editorItem.title}
                onChange={(event) => setEditorItem((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
              <textarea
                value={editorItem.description}
                onChange={(event) => setEditorItem((prev) => ({ ...prev, description: event.target.value }))}
                rows={5}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={editorItem.is_active}
                onChange={(event) => setEditorItem((prev) => ({ ...prev, is_active: event.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
              />
              Show this feature on the storefront
            </label>
          </div>

          <DialogFooter>
            <button
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={saveEditor}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              {editorMode === 'add' ? 'Add Feature' : 'Update Feature'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
