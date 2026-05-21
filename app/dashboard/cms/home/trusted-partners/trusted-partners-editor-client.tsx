'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CmsSaveAction } from '@/components/cms-save-action'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

type LogoStatus = 'active' | 'draft' | 'archived'

type LogoItem = {
  clientId: string
  id?: string
  name: string
  logo_path: string
  logo_alt: string
  link_url: string
  display_order: number
  status: LogoStatus
}

type EditorLogo = Omit<LogoItem, 'id'>

export type TrustedPartnersInitialData = {
  heading: string
  is_enabled: boolean
  logos: Array<{
    id: string
    name: string
    logo_path: string
    logo_alt: string | null
    link_url: string | null
    display_order: number
    status: LogoStatus
  }>
}

const emptyLogo = (nextOrder = 1): EditorLogo => ({
  clientId: `draft-${Date.now()}`,
  name: '',
  logo_path: '',
  logo_alt: '',
  link_url: '',
  display_order: nextOrder,
  status: 'active',
})

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function uploadLogo(file: File) {
  const accessToken = await getAccessToken()
  if (!accessToken) throw new Error('You must be signed in to upload logos.')

  const payload = new FormData()
  payload.append('file', file)

  const response = await fetch('/api/cms/home/trusted-partners/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: payload,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.path) throw new Error(data?.error ?? 'Unable to upload logo.')
  return data.path as string
}

export function TrustedPartnersEditorClient({ initialData }: { initialData: TrustedPartnersInitialData }) {
  const { toast } = useToast()
  const [heading, setHeading] = useState(initialData.heading)
  const [isEnabled, setIsEnabled] = useState(initialData.is_enabled)
  const [logos, setLogos] = useState<LogoItem[]>(initialData.logos.map((logo) => ({
    ...logo,
    clientId: logo.id,
    logo_alt: logo.logo_alt ?? '',
    link_url: logo.link_url ?? '',
  })))
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorItem, setEditorItem] = useState<EditorLogo>(emptyLogo())
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const sortedLogos = useMemo(() => [...logos].sort((a, b) => a.display_order - b.display_order), [logos])

  const openAdd = () => {
    setEditorItem(emptyLogo(Math.max(...logos.map((logo) => logo.display_order), 0) + 1))
    setEditorOpen(true)
  }

  const openEdit = (logo: LogoItem) => {
    setEditorItem({
      clientId: logo.clientId,
      name: logo.name,
      logo_path: logo.logo_path,
      logo_alt: logo.logo_alt,
      link_url: logo.link_url,
      display_order: logo.display_order,
      status: logo.status,
    })
    setEditorOpen(true)
  }

  const saveEditor = () => {
    setLogos((current) => {
      const index = current.findIndex((logo) => logo.clientId === editorItem.clientId)
      if (index >= 0) {
        const next = [...current]
        next[index] = { ...next[index], ...editorItem }
        return next
      }
      return [...current, editorItem]
    })
    setEditorOpen(false)
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const path = await uploadLogo(file)
      setEditorItem((current) => ({ ...current, logo_path: path }))
      toast({ title: 'Logo uploaded', description: 'Trusted partner logo uploaded successfully.' })
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Unable to upload logo.' })
    } finally {
      setIsUploading(false)
    }
  }

  const saveAll = async () => {
    setIsSaving(true)
    const accessToken = await getAccessToken()
    if (!accessToken) {
      setIsSaving(false)
      toast({ title: 'Not signed in', description: 'Please sign in again to save changes.' })
      return
    }

    const response = await fetch('/api/cms/home/trusted-partners', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        heading,
        is_enabled: isEnabled,
        logos: sortedLogos.map(({ name, logo_path, logo_alt, link_url, display_order, status }) => ({
          name,
          logo_path,
          logo_alt,
          link_url,
          display_order,
          status,
        })),
      }),
    })

    const payload = await response.json().catch(() => null)
    setIsSaving(false)

    if (!response.ok) {
      toast({ title: 'Save failed', description: payload?.error ?? 'Unable to save trusted partners.' })
      return
    }

    setConfirmOpen(false)
    toast({ title: 'Saved', description: 'Trusted partners updated successfully.' })
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Trusted Partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the homepage partner logo marquee.</p>
      </div>

      <div className="mb-6 grid max-w-4xl gap-5 rounded-lg border border-border bg-white p-5 shadow-xs md:grid-cols-[1fr_220px]">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
          <input value={heading} onChange={(event) => setHeading(event.target.value)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Status</label>
          <button type="button" onClick={() => setIsEnabled((current) => !current)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-4">
          <h2 className="font-jakarta text-lg font-semibold text-foreground">Partner Logos</h2>
          <button type="button" onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
            <Plus size={16} />
            Add Logo
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Logo Path</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogos.map((logo) => (
              <tr key={logo.clientId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{logo.display_order}</td>
                <td className="px-5 py-4 text-sm font-medium">{logo.name}</td>
                <td className="px-5 py-4 text-sm text-muted-foreground"><span className="block max-w-[360px] truncate">{logo.logo_path}</span></td>
                <td className="px-5 py-4 text-sm">{logo.status}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(logo)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"><Edit2 size={14} /></button>
                    <button onClick={() => setLogos((current) => current.filter((item) => item.clientId !== logo.clientId))} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!sortedLogos.length ? (
              <tr><td colSpan={5} className="px-5 py-8 text-sm text-muted-foreground">No logos yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Partner Logo</DialogTitle>
            <DialogDescription>Add or edit a logo in the homepage marquee.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Name"><input value={editorItem.name} onChange={(event) => setEditorItem((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" /></Field>
            <Field label="Logo Path or URL">
              <input value={editorItem.logo_path} onChange={(event) => setEditorItem((current) => ({ ...current, logo_path: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
                {isUploading ? 'Uploading...' : 'Upload Logo'}
                <input type="file" accept=".svg,image/svg+xml,image/jpeg,image/png,image/webp,image/avif" className="hidden" disabled={isUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file) }} />
              </label>
            </Field>
            <Field label="Alt Text"><input value={editorItem.logo_alt} onChange={(event) => setEditorItem((current) => ({ ...current, logo_alt: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" /></Field>
            <Field label="Optional Link"><input value={editorItem.link_url} onChange={(event) => setEditorItem((current) => ({ ...current, link_url: event.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Display Order"><input type="number" value={editorItem.display_order} onChange={(event) => setEditorItem((current) => ({ ...current, display_order: Number(event.target.value) || 0 }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" /></Field>
              <Field label="Status">
                <select value={editorItem.status} onChange={(event) => setEditorItem((current) => ({ ...current, status: event.target.value as LogoStatus }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={saveEditor} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">Save Logo</button>
            <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">Cancel</button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={confirmOpen} title="Save trusted partners?" description="This will update the live homepage trusted partners strip." confirmText="Save" onConfirm={() => void saveAll()} onCancel={() => setConfirmOpen(false)} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  )
}
