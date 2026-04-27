'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { supabase } from '@/lib/supabase'

type ApiPayload = {
  section_key?: string
  eyebrow?: string
  heading?: string
  subtitle?: string
  error?: string
}

export type AboutHeroInitialData = {
  section_key: string
  eyebrow: string
  heading: string
  subtitle: string
}

export function AboutHeroEditorClient({ initialData }: { initialData: AboutHeroInitialData }) {
  const [formData, setFormData] = useState(initialData)
  const [status, setStatus] = useState('About hero loaded')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (!token) {
      setIsSaving(false)
      setStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/about/hero', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        eyebrow: formData.eyebrow,
        heading: formData.heading,
        subtitle: formData.subtitle,
      }),
    })

    const payload = (await response.json().catch(() => null)) as ApiPayload | null
    setIsSaving(false)

    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save about hero.')
      return
    }

    setConfirmOpen(false)
    setStatus('About hero saved')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/about" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to About
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">About Hero</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the about hero section</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="max-w-2xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
          <input value={formData.eyebrow} onChange={(e) => setFormData((prev) => ({ ...prev, eyebrow: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
          <input value={formData.heading} onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label>
          <textarea value={formData.subtitle} onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))} rows={5} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save About Hero?"
        description="This will update the about hero section on the live site."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={handleSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
