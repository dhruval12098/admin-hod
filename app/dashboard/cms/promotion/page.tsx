'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { CMSTabs } from '@/components/cms-tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export default function PromotionPage() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [status, setStatus] = useState('Loading promotion popup...')
  const [form, setForm] = useState({
    label: '',
    title: '',
    description: '',
    cta_text: '',
    cta_link: '',
    is_active: true,
    show_once_per_session: true,
  })

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    const accessToken = await getAccessToken()
    if (!accessToken) return

    const response = await fetch('/api/cms/promotion', {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to load promotion popup.')
      return
    }

    const item = payload?.item
    if (item) {
      setForm({
        label: item.label ?? '',
        title: item.title ?? '',
        description: item.description ?? '',
        cta_text: item.cta_text ?? '',
        cta_link: item.cta_link ?? '',
        is_active: Boolean(item.is_active),
        show_once_per_session: item.show_once_per_session !== false,
      })
    }

    setStatus('Promotion popup loaded')
  }

  const save = async () => {
    setIsSaving(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Missing access token.')

      const response = await fetch('/api/cms/promotion', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to save promotion popup.')
      }

      setConfirmOpen(false)
      setStatus('Promotion popup saved')
      toast({ title: 'Saved', description: 'Promotion popup updated successfully.' })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save promotion popup.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-8">
      <CMSTabs />
      <div className="mb-8 mt-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to CMS
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Promotion Popup</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the first-visit promotional modal shown on the storefront.</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="max-w-4xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Label</label>
            <input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">CTA Text</label>
            <input value={form.cta_text} onChange={(e) => setForm((prev) => ({ ...prev, cta_text: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={5} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">CTA Link</label>
          <input value={form.cta_link} onChange={(e) => setForm((prev) => ({ ...prev, cta_link: e.target.value }))} placeholder="/shop" className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" />
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
            Active
          </label>
          <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.show_once_per_session}
              onChange={(e) => setForm((prev) => ({ ...prev, show_once_per_session: e.target.checked }))}
            />
            Show once per session
          </label>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save promotion popup?"
        description="This will update the storefront promotional popup."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={() => void save()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
