'use client'

import Link from 'next/link'
import { useState, type ChangeEvent } from 'react'
import { ArrowLeft, Edit2, Loader2, Upload } from 'lucide-react'
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

type DiamondInfoItem = {
  sort_order: number
  label: string
  heading: string
  paragraph: string
}

type ApiPayload = {
  items?: DiamondInfoItem[]
  config?: DiamondInfoConfig
  error?: string
}

type DiamondInfoConfig = {
  video_enabled: boolean
  video_path: string
  video_poster_path: string
}

export type DiamondInfoInitialData = {
  items: DiamondInfoItem[]
  config: DiamondInfoConfig
}

function toPublicUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_COLLECTION_BUCKET || 'hod'
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return projectUrl ? `${projectUrl}/storage/v1/object/public/${bucket}/${path}` : path
}

export function DiamondInfoEditorClient({ initialData }: { initialData: DiamondInfoInitialData }) {
  const { toast } = useToast()
  const [items, setItems] = useState<DiamondInfoItem[]>(initialData.items)
  const [config, setConfig] = useState<DiamondInfoConfig>(initialData.config)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(initialData.config.video_path ? toPublicUrl(initialData.config.video_path) : '')
  const [posterPreviewUrl, setPosterPreviewUrl] = useState(initialData.config.video_poster_path ? toPublicUrl(initialData.config.video_poster_path) : '')
  const [loadStatus, setLoadStatus] = useState(initialData.items.some((item) => item.label || item.heading || item.paragraph) ? 'Diamond Info loaded' : 'No Diamond Info rows found yet')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<DiamondInfoItem | null>(null)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [isUploadingPoster, setIsUploadingPoster] = useState(false)

  const handleChange = (sortOrder: number, field: keyof DiamondInfoItem, value: string) => {
    setItems((prev) => prev.map((item) => (item.sort_order === sortOrder ? { ...item, [field]: value } : item)))
  }

  const openEditor = (item: DiamondInfoItem) => {
    setEditorItem(item)
    setEditorOpen(true)
  }

  const updateAndSave = async () => {
    if (!editorItem) return

    const nextItems = items.map((item) => (item.sort_order === editorItem.sort_order ? editorItem : item))
    setItems(nextItems)
    setEditorOpen(false)
    setLoadStatus('Saving Diamond Info item...')

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/diamond-info', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ items: nextItems, config }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Diamond Info.')
      return
    }

    setLoadStatus('Diamond Info saved')
    toast({
      title: 'Saved',
      description: 'Diamond Info updated successfully.',
    })
  }

  const saveConfig = async (nextConfig: DiamondInfoConfig, statusLabel: string) => {
    setConfig(nextConfig)
    setLoadStatus(statusLabel)

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/diamond-info', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ items, config: nextConfig }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save Diamond Info settings.')
      return
    }

    setLoadStatus('Diamond Info settings saved')
    toast({
      title: 'Saved',
      description: 'Diamond Info settings updated successfully.',
    })
  }

  const uploadAsset = async (event: ChangeEvent<HTMLInputElement>, kind: 'video' | 'poster') => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', kind)

    if (kind === 'video') {
      setIsUploadingVideo(true)
      setLoadStatus('Uploading Diamond Info video...')
    } else {
      setIsUploadingPoster(true)
      setLoadStatus('Uploading Diamond Info poster...')
    }

    const response = await fetch('/api/cms/uploads/diamond-info', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as { path?: string; url?: string; error?: string } | null

    if (kind === 'video') {
      setIsUploadingVideo(false)
    } else {
      setIsUploadingPoster(false)
    }

    if (!response.ok || !payload?.path) {
      setLoadStatus(payload?.error ?? 'Upload failed.')
      toast({
        title: 'Upload failed',
        description: payload?.error ?? 'Upload failed.',
        variant: 'destructive',
      })
      return
    }

    const nextConfig = {
      ...config,
      video_enabled: kind === 'video' ? true : config.video_enabled,
      [kind === 'video' ? 'video_path' : 'video_poster_path']: payload.path,
    }

    if (kind === 'video') {
      setVideoPreviewUrl(payload.url || toPublicUrl(payload.path))
    } else {
      setPosterPreviewUrl(payload.url || toPublicUrl(payload.path))
    }

    await saveConfig(nextConfig, kind === 'video' ? 'Saving Diamond Info video...' : 'Saving Diamond Info poster...')
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard/cms/home"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Diamond Info</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the three informational text blocks below the hero</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="mb-8 max-w-5xl rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-foreground">Visual Mode</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Keep the current diamond animation by default, or switch this section to an optional uploaded video while preserving the same sticky scroll presentation.
            </p>
          </div>

          <div className="flex rounded-2xl border border-border bg-secondary/30 p-1">
            <button
              type="button"
              onClick={() => void saveConfig({ ...config, video_enabled: false }, 'Switching Diamond Info to 3D diamond mode...')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                !config.video_enabled ? 'bg-foreground text-white shadow-md' : 'text-foreground hover:bg-secondary'
              }`}
            >
              Diamond
            </button>
            <button
              type="button"
              onClick={() => void saveConfig({ ...config, video_enabled: true }, 'Switching Diamond Info to video mode...')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                config.video_enabled ? 'bg-foreground text-white shadow-md' : 'text-foreground hover:bg-secondary'
              }`}
            >
              Video
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-5">
            <p className="text-sm font-semibold text-foreground">Diamond Info Video</p>
            <p className="mt-2 text-xs text-muted-foreground">Stored in `diamond-info/videos` inside the bucket.</p>
            {config.video_path ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-black/90">
                <video
                  src={videoPreviewUrl || toPublicUrl(config.video_path)}
                  poster={config.video_poster_path ? (posterPreviewUrl || toPublicUrl(config.video_poster_path)) : undefined}
                  controls
                  muted
                  playsInline
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No video uploaded yet.
              </div>
            )}
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
              {isUploadingVideo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploadingVideo ? 'Uploading video...' : 'Upload video'}
              <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => void uploadAsset(event, 'video')} />
            </label>
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/20 p-5">
            <p className="text-sm font-semibold text-foreground">Video Poster</p>
            <p className="mt-2 text-xs text-muted-foreground">Optional preview image stored in `diamond-info/posters`.</p>
            {config.video_poster_path ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
                <img src={posterPreviewUrl || toPublicUrl(config.video_poster_path)} alt="Diamond Info poster" className="h-40 w-full object-cover" />
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No poster uploaded yet.
              </div>
            )}
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
              {isUploadingPoster ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploadingPoster ? 'Uploading poster...' : 'Upload poster'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => void uploadAsset(event, 'poster')} />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Label</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Heading</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Paragraph</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.sort_order} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm text-foreground">{item.sort_order}</td>
                <td className="px-5 py-4 text-sm text-foreground">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleChange(item.sort_order, 'label', e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </td>
                <td className="px-5 py-4 text-sm text-foreground">
                  <span className="block max-w-[220px] truncate" title={item.heading}>
                    {item.heading}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-muted-foreground">
                  <span className="block max-w-[420px] truncate" title={item.paragraph}>
                    {item.paragraph}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditor(item)}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Diamond Info</DialogTitle>
            <DialogDescription>
              Update the label, heading, and paragraph for this block.
            </DialogDescription>
          </DialogHeader>

          {editorItem && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Label</label>
                <input
                  type="text"
                  value={editorItem.label}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, label: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
                <input
                  type="text"
                  value={editorItem.heading}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, heading: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Paragraph</label>
                <textarea
                  value={editorItem.paragraph}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setEditorItem((prev) => (prev ? { ...prev, paragraph: e.target.value } : prev))
                  }
                  rows={5}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setEditorOpen(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={updateAndSave}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Update Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
