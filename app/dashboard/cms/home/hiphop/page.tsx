'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type HipHopSection = {
  eyebrow: string
  heading_line_1: string
  heading_line_2: string
  heading_emphasis: string
  cta_label: string
  cta_link: string
  image_path: string
  image_alt: string
}

type ApiPayload = {
  section?: HipHopSection
  path?: string
  error?: string
}

const defaultSection: HipHopSection = {
  eyebrow: 'Hip Hop Collection · House of Diams',
  heading_line_1: 'Ice That',
  heading_line_2: 'Speaks',
  heading_emphasis: 'Louder.',
  cta_label: 'Shop Iced Pieces',
  cta_link: '/hiphop',
  image_path: '',
  image_alt: 'House of Diams Hip Hop Collection',
}

export default function HipHopEditor() {
  const { toast } = useToast()
  const [section, setSection] = useState<HipHopSection>(defaultSection)
  const [loadStatus, setLoadStatus] = useState('Loading hip hop showcase...')
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) {
        setLoadStatus('You are not signed in.')
        return
      }

      const response = await fetch('/api/cms/home/hiphop', {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      const payload = (await response.json().catch(() => null)) as ApiPayload | null
      if (!response.ok) {
        setLoadStatus(payload?.error ?? 'Unable to load hip hop showcase.')
        return
      }

      if (payload?.section) setSection(payload.section)
      setLoadStatus('Hip hop showcase loaded')
    }

    load()
  }, [])

  const uploadImage = async (file: File) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setLoadStatus('You are not signed in.')
      return
    }

    setUploadState('uploading')
    setLoadStatus('Uploading image...')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/cms/uploads/hiphop-showcase', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    if (!response.ok || !payload?.path) {
      setUploadState('error')
      setLoadStatus(payload?.error ?? 'Unable to upload image.')
      return
    }

    setSection((prev) => ({ ...prev, image_path: payload.path ?? '' }))
    setUploadState('done')
    setLoadStatus('Image uploaded successfully')
    toast({ title: 'Uploaded', description: 'Hip hop showcase image uploaded successfully.' })
  }

  const confirmSave = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token

    if (!accessToken) {
      setIsSaving(false)
      setLoadStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/home/hiphop', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(section),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setLoadStatus(payload?.error ?? 'Unable to save hip hop showcase.')
      return
    }

    setConfirmOpen(false)
    setLoadStatus('Hip hop showcase saved')
    toast({ title: 'Saved', description: 'Hip hop showcase updated successfully.' })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Hip Hop Showcase</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the hip hop section copy, CTA, and hero image</p>
        <p className="mt-2 text-xs text-muted-foreground">{loadStatus}</p>
      </div>

      <div className="max-w-4xl space-y-4 rounded-lg border border-border bg-white p-6 shadow-xs">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
          <input value={section.eyebrow} onChange={(e) => setSection((prev) => ({ ...prev, eyebrow: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Heading Line 1</label>
            <input value={section.heading_line_1} onChange={(e) => setSection((prev) => ({ ...prev, heading_line_1: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Heading Line 2</label>
            <input value={section.heading_line_2} onChange={(e) => setSection((prev) => ({ ...prev, heading_line_2: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Heading Emphasis</label>
            <input value={section.heading_emphasis} onChange={(e) => setSection((prev) => ({ ...prev, heading_emphasis: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">CTA Label</label>
            <input value={section.cta_label} onChange={(e) => setSection((prev) => ({ ...prev, cta_label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">CTA Link</label>
            <input value={section.cta_link} onChange={(e) => setSection((prev) => ({ ...prev, cta_link: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Image Alt Text</label>
          <input value={section.image_alt} onChange={(e) => setSection((prev) => ({ ...prev, image_alt: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Image</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              <Upload size={14} />
              {uploadState === 'uploading' ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadState === 'uploading'}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadImage(file)
                }}
              />
            </label>
            <span className="text-xs text-muted-foreground">{section.image_path || 'No image uploaded yet'}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Uploads save under the dedicated `hiphop-showcase/` folder.</p>
        </div>
      </div>

      <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save hip hop showcase?"
        description="This will update the hip hop section on the homepage."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={confirmSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
