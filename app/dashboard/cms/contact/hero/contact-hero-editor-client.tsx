'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { supabase } from '@/lib/supabase'

export type ContactHeroInitialData = {
  item: {
    section_key: string
    eyebrow: string
    heading: string
    subtitle: string
  }
}

export function ContactHeroEditorClient({ initialData }: { initialData: ContactHeroInitialData }) {
  const [eyebrow, setEyebrow] = useState(initialData.item.eyebrow)
  const [heading, setHeading] = useState(initialData.item.heading)
  const [subtitle, setSubtitle] = useState(initialData.item.subtitle)
  const [status, setStatus] = useState('Contact hero loaded')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const save = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setIsSaving(false)
      setStatus('You are not signed in.')
      return
    }

    const response = await fetch('/api/cms/contact/hero', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ eyebrow, heading, subtitle }),
    })

    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    setIsSaving(false)

    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save contact hero.')
      return
    }

    setConfirmOpen(false)
    setStatus('Contact hero saved')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/dashboard/cms/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} />
          Back to Contact
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-semibold">Contact Hero</h1>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="max-w-2xl space-y-6 rounded-lg border border-border bg-white p-8">
        <div>
          <label className="mb-2 block text-sm font-semibold">Eyebrow</label>
          <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">Heading</label>
          <input value={heading} onChange={(e) => setHeading(e.target.value)} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">Subtitle</label>
          <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={5} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm" />
        </div>
      </div>

      <ConfirmDialog isOpen={confirmOpen} title="Save Contact Hero?" description="This will update the contact hero on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={save} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}
