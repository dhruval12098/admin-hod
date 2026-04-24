'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export default function AboutHeroEditor() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({ eyebrow: '', heading: '', subtitle: '' })
  const [status, setStatus] = useState('Loading about hero...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return setStatus('You are not signed in.')
      const response = await fetch('/api/cms/about/hero', { headers: { authorization: `Bearer ${token}` } })
      const payload = await response.json().catch(() => null)
      if (!response.ok) return setStatus(payload?.error ?? 'Unable to load about hero.')
      setFormData({
        eyebrow: payload?.eyebrow ?? '',
        heading: payload?.heading ?? '',
        subtitle: payload?.subtitle ?? '',
      })
      setStatus('About hero loaded')
    }
    load()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) { setIsSaving(false); return setStatus('You are not signed in.') }
    const response = await fetch('/api/cms/about/hero', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(formData),
    })
    const payload = await response.json().catch(() => null)
    setIsSaving(false)
    if (!response.ok) return setStatus(payload?.error ?? 'Unable to save about hero.')
    setStatus('About hero saved')
    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'About hero updated successfully.' })
  }

  return <div className="min-h-screen bg-background p-8"><div className="mb-8 flex items-center justify-between gap-4"><Link href="/dashboard/cms/about" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"><ArrowLeft size={16} />Back to About</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="mb-10"><h1 className="font-jakarta text-3xl font-semibold text-foreground">About Hero</h1><p className="mt-1 text-sm text-muted-foreground">Edit the about hero section</p><p className="mt-2 text-xs text-muted-foreground">{status}</p></div><div className="max-w-2xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs"><div><label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label><input value={formData.eyebrow} onChange={(e) => setFormData((prev) => ({ ...prev, eyebrow: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Heading</label><input value={formData.heading} onChange={(e) => setFormData((prev) => ({ ...prev, heading: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label><textarea value={formData.subtitle} onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))} rows={5} className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm" /></div></div><ConfirmDialog isOpen={confirmOpen} title="Save About Hero?" description="This will update the about hero section on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={handleSave} onCancel={() => setConfirmOpen(false)} /></div>
}
