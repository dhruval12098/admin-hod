'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Edit2, ImagePlus, Plus, Trash2, Upload } from 'lucide-react'
import { CMSTabs } from '@/components/cms-tabs'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useCmsAtomicListSave } from '@/hooks/use-cms-atomic-list-save'

type ServiceBannerBlock = {
  clientId: string
  id?: string
  title: string
  paragraph: string
  sort_order: number
  is_active: boolean
}

type EditorBlock = Omit<ServiceBannerBlock, 'id'>

const emptyBlock = (order: number): EditorBlock => ({
  clientId: `draft-${Date.now()}`,
  title: '',
  paragraph: '',
  sort_order: order,
  is_active: true,
})

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function ServiceBannerEditorClient() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEnabled, setIsEnabled] = useState(true)
  const [imagePath, setImagePath] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [blocks, setBlocks] = useState<ServiceBannerBlock[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBlock, setEditorBlock] = useState<EditorBlock>(emptyBlock(1))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState('Loading service banner...')
  const { prepareSave, acceptSave } = useCmsAtomicListSave([], '')

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)),
    [blocks]
  )

  useEffect(() => {
    let active = true

    async function load() {
      const token = await getAccessToken()
      if (!token) {
        if (active) { setStatus('You are not signed in.'); setIsLoading(false) }
        return
      }

      const response = await fetch('/api/cms/service-banner', { headers: { authorization: `Bearer ${token}` } })
      const payload = await response.json().catch(() => null) as {
        error?: string
        section?: { image_path?: string | null; image_alt?: string | null; image_url?: string; is_enabled?: boolean }
        blocks?: Array<{ id: string; title: string; paragraph: string; sort_order: number; is_active: boolean }>
        revision?: string
      } | null

      if (!active) return
      if (!response.ok || !payload?.section) {
        setStatus(payload?.error ?? 'Unable to load the service banner.')
        setIsLoading(false)
        return
      }

      setIsEnabled(payload.section.is_enabled !== false)
      setImagePath(payload.section.image_path ?? '')
      setImageUrl(payload.section.image_url ?? '')
      setImageAlt(payload.section.image_alt ?? '')
      const nextBlocks=(payload.blocks ?? []).map((block) => ({ clientId: `id-${block.id}`, ...block }))
      setBlocks(nextBlocks)
      if(payload.revision)acceptSave(nextBlocks,payload.revision)
      setStatus('Service banner loaded')
      setIsLoading(false)
    }

    void load()
    return () => { active = false }
  }, [])

  const openNewBlock = () => {
    setEditorBlock(emptyBlock(Math.max(...blocks.map((block) => block.sort_order), 0) + 1))
    setEditorOpen(true)
  }

  const saveBlockDraft = () => {
    const title = editorBlock.title.trim()
    const paragraph = editorBlock.paragraph.trim()
    if (!title || !paragraph) {
      setStatus('Add both a dropdown title and paragraph.')
      return
    }

    setBlocks((current) => {
      const index = current.findIndex((block) => block.clientId === editorBlock.clientId)
      const next = { ...editorBlock, title, paragraph }
      if (index < 0) return [...current, next]
      const copy = [...current]
      copy[index] = { ...copy[index], ...next }
      return copy
    })
    setStatus('Block updated locally. Save changes to publish.')
    setEditorOpen(false)
  }

  const moveBlock = (clientId: string, direction: -1 | 1) => {
    const ordered = [...sortedBlocks]
    const index = ordered.findIndex((block) => block.clientId === clientId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    setBlocks(ordered.map((block, order) => ({ ...block, sort_order: order + 1 })))
    setStatus('Block order changed locally. Save changes to publish.')
  }

  const uploadImage = async (file: File) => {
    setIsUploading(true)
    setStatus('Uploading banner image...')
    const token = await getAccessToken()
    if (!token) { setIsUploading(false); setStatus('You are not signed in.'); return }

    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/cms/uploads/service-banner', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: formData,
    })
    const payload = await response.json().catch(() => null) as { path?: string; url?: string; error?: string } | null
    setIsUploading(false)

    if (!response.ok || !payload?.path) {
      setStatus(payload?.error ?? 'Unable to upload the banner image.')
      return
    }

    setImagePath(payload.path)
    setImageUrl(payload.url ?? '')
    setStatus('Banner image uploaded. Save changes to publish.')
  }

  const saveAll = async () => {
    setIsSaving(true)
    const token = await getAccessToken()
    if (!token) { setIsSaving(false); setStatus('You are not signed in.'); return }

    const response = await fetch('/api/cms/service-banner', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(prepareSave({
        parent: { image_path: imagePath, image_alt: imageAlt, is_enabled: isEnabled },
        items: sortedBlocks.map((block, index) => ({
          id: block.id,
          title: block.title,
          paragraph: block.paragraph,
          sort_order: index + 1,
          is_active: block.is_active,
        })),
      }, sortedBlocks)),
    })
    const payload = await response.json().catch(() => null) as { error?: string; items?: Array<{ id: string; title: string; paragraph: string; sort_order: number; is_active: boolean }>; revision?: string } | null
    setIsSaving(false)

    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save the service banner.')
      return
    }
    if(!payload?.items||!payload.revision){setStatus('Saved, but the updated blocks could not be reloaded. Reload this page.');return}
    const nextBlocks=payload.items.map((block)=>({clientId:`id-${block.id}`,...block}));setBlocks(nextBlocks);acceptSave(payload.items,payload.revision)

    setConfirmOpen(false)
    setBlocks((current) => current.map((block, index) => ({ ...block, sort_order: index + 1 })))
    setStatus('Service banner saved')
    toast({ title: 'Saved', description: 'Service banner content updated successfully.' })
  }

  return (
    <div>
      <CMSTabs />
      <div className="p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="font-jakarta text-3xl font-semibold text-foreground">Service Banner</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage the standalone image and expandable service blocks. The storefront component remains unpublished until it is placed on a page.</p>
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{status}</p>
          </div>
          <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
        </div>

        <div className="max-w-6xl space-y-6">
          <section className="rounded-lg border border-border bg-white p-6 shadow-xs">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Section image</h2>
                <p className="mt-1 text-xs text-muted-foreground">One image shared by every dropdown block.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} />
                Enabled
              </label>
            </div>

            <div className="relative aspect-[16/6] min-h-[320px] overflow-hidden border border-border bg-secondary/30">
              {imageUrl ? <img src={imageUrl} alt={imageAlt || 'Service banner preview'} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><ImagePlus size={28} strokeWidth={1.5} /><span className="text-sm">No banner image uploaded</span></div>}
            </div>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = '' }} />
            <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
              <Upload size={16} />{isUploading ? 'Uploading...' : imagePath ? 'Replace image' : 'Upload image'}
            </button>

            <label className="mt-5 block text-sm font-semibold text-foreground">
              Image alt text
              <input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Describe the banner image" />
            </label>
            {imagePath ? <p className="mt-2 break-all text-xs text-muted-foreground">{imagePath}</p> : null}
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-white shadow-xs">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Dropdown blocks</h2>
                <p className="mt-1 text-xs text-muted-foreground">Add, edit, hide, delete, or reorder blocks.</p>
              </div>
              <button type="button" onClick={openNewBlock} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"><Plus size={16} />Add block</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead><tr className="border-b border-border bg-secondary/40"><th className="w-20 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Title</th><th className="w-24 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Active</th><th className="w-56 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th></tr></thead>
                <tbody>
                  {sortedBlocks.map((block, index) => (
                    <tr key={block.clientId} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-4 text-sm tabular-nums text-muted-foreground">{index + 1}</td>
                      <td className="px-5 py-4"><div className="text-sm font-medium text-foreground">{block.title}</div><p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">{block.paragraph}</p></td>
                      <td className="px-5 py-4"><input type="checkbox" checked={block.is_active} onChange={(event) => setBlocks((current) => current.map((entry) => entry.clientId === block.clientId ? { ...entry, is_active: event.target.checked } : entry))} aria-label={`${block.title} active`} /></td>
                      <td className="px-5 py-4 text-right"><div className="inline-flex items-center gap-1"><button type="button" onClick={() => moveBlock(block.clientId, -1)} disabled={index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-secondary disabled:opacity-30" title="Move up"><ArrowUp size={15} /></button><button type="button" onClick={() => moveBlock(block.clientId, 1)} disabled={index === sortedBlocks.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-secondary disabled:opacity-30" title="Move down"><ArrowDown size={15} /></button><button type="button" onClick={() => { setEditorBlock(block); setEditorOpen(true) }} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-secondary"><Edit2 size={14} />Edit</button><button type="button" onClick={() => { setBlocks((current) => current.filter((entry) => entry.clientId !== block.clientId)); setStatus('Block removed locally. Save changes to publish.') }} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" title="Delete block"><Trash2 size={15} /></button></div></td>
                    </tr>
                  ))}
                  {!isLoading && sortedBlocks.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">No blocks yet. Add the first dropdown block.</td></tr> : null}
                  {isLoading ? <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Loading blocks...</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{blocks.some((block) => block.clientId === editorBlock.clientId) ? 'Edit block' : 'Add block'}</DialogTitle><DialogDescription>Enter the dropdown heading and the paragraph shown when it expands.</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            <label className="block text-sm font-semibold text-foreground">Dropdown title<input value={editorBlock.title} onChange={(event) => setEditorBlock((current) => ({ ...current, title: event.target.value }))} className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Complimentary shipping & returns" /></label>
            <label className="block text-sm font-semibold text-foreground">Paragraph<textarea value={editorBlock.paragraph} onChange={(event) => setEditorBlock((current) => ({ ...current, paragraph: event.target.value }))} rows={6} className="mt-2 w-full resize-y rounded-md border border-border bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Add the information shown inside this dropdown." /></label>
            <label className="flex items-center gap-3 text-sm font-medium text-foreground"><input type="checkbox" checked={editorBlock.is_active} onChange={(event) => setEditorBlock((current) => ({ ...current, is_active: event.target.checked }))} />Active</label>
          </div>
          <DialogFooter><button type="button" onClick={() => setEditorOpen(false)} className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-secondary">Cancel</button><button type="button" onClick={saveBlockDraft} className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">Save block</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={confirmOpen} title="Save service banner?" description="This will update the standalone service banner content available to the storefront component." confirmText="Save changes" cancelText="Cancel" onConfirm={() => void saveAll()} onCancel={() => setConfirmOpen(false)} isLoading={isSaving} />
    </div>
  )
}
