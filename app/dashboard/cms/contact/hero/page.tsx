'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export default function ContactHeroEditor() {
  const { toast } = useToast()
  const [eyebrow, setEyebrow] = useState('Get In Touch')
  const [heading, setHeading] = useState("Let's Talk")
  const [subtitle, setSubtitle] = useState('Questions about a piece, a custom order, or B2B wholesale? Reach out - we reply within 24 hours.')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return
      const response = await fetch('/api/cms/contact/hero', { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.item) {
        setEyebrow(payload.item.eyebrow ?? eyebrow)
        setHeading(payload.item.heading ?? heading)
        setSubtitle(payload.item.subtitle ?? subtitle)
      }
    })()
  }, [])

  const save = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return
    await fetch('/api/cms/contact/hero', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ eyebrow, heading, subtitle }),
    })
    setIsSaving(false)
    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Contact hero updated successfully.' })
  }

  return <div className="min-h-screen bg-background p-8"><div className="mb-8 flex items-center justify-between"><Link href="/dashboard/cms/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Back to Contact</Link><CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" /></div><div className="max-w-2xl space-y-6 rounded-lg border border-border bg-white p-8"><div><label className="mb-2 block text-sm font-semibold">Eyebrow</label><input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold">Heading</label><input value={heading} onChange={(e) => setHeading(e.target.value)} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm" /></div><div><label className="mb-2 block text-sm font-semibold">Subtitle</label><textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={5} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm" /></div></div><ConfirmDialog isOpen={confirmOpen} title="Save Contact Hero?" description="This will update the contact hero on the live site." confirmText="Save" cancelText="Cancel" type="confirm" isLoading={isSaving} onConfirm={save} onCancel={() => setConfirmOpen(false)} /></div>
}
