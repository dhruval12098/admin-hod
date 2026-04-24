'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
} from 'lucide-react'

type Block = {
  clientId: string
  id?: number
  sort_order: number
  heading: string
  description: string
  body: string
}

type Payload = {
  page?: { eyebrow?: string; title?: string; subtitle?: string }
  blocks?: Array<{ id: number; sort_order: number; heading: string; description: string; body: string }>
  error?: string
}

const DOCS_META: Record<string, { label: string; description: string }> = {
  shipping: { label: 'Shipping', description: 'Manage shipping timelines and delivery details' },
  returns: { label: 'Returns', description: 'Manage returns, exchanges, and claim language' },
  terms: { label: 'Terms & Conditions', description: 'Manage purchase and website terms' },
  'privacy-policy': { label: 'Privacy Policy', description: 'Manage privacy and data usage copy' },
}

const emptyBlock = (sort_order: number): Block => ({
  clientId: `draft-${Date.now()}`,
  sort_order,
  heading: '',
  description: '',
  body: '',
})

function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder: 'Write the block body here...',
      }),
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[260px] w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:border-primary prose prose-sm max-w-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '<p></p>', false)
    }
  }, [editor, value])

  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex flex-wrap gap-2 border-b border-border bg-secondary/30 p-2">
        <button
          type="button"
          onClick={() => editor?.chain().focus().setParagraph().run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <Pilcrow size={13} />
          Paragraph
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <Heading2 size={13} />
          H2
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <Heading3 size={13} />
          H3
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <Bold size={13} />
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <Italic size={13} />
          Italic
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <List size={13} />
          Bullet
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <ListOrdered size={13} />
          Numbered
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <Quote size={13} />
          Quote
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

export default function DocsEditorPage() {
  const { toast } = useToast()
  const params = useParams<{ slug: string }>()
  const slug = useMemo(() => (Array.isArray(params?.slug) ? params.slug[0] : params?.slug ?? ''), [params])
  const meta = DOCS_META[slug] ?? { label: 'Docs', description: 'Edit docs page content' }
  const [pageData, setPageData] = useState({ eyebrow: '', title: '', subtitle: '' })
  const [blocks, setBlocks] = useState<Block[]>([])
  const [status, setStatus] = useState('Loading docs page...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBlock, setEditorBlock] = useState<Block>(emptyBlock(1))

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.sort_order - b.sort_order || a.clientId.localeCompare(b.clientId)), [blocks])
  const nextOrder = Math.max(...blocks.map((block) => block.sort_order), 0) + 1

  useEffect(() => {
    const load = async () => {
      if (!slug) return
      const response = await fetch(`/api/cms/docs/${slug}`)
      const payload = (await response.json().catch(() => null)) as Payload | null
      if (!response.ok) return setStatus(payload?.error ?? 'Unable to load docs page.')

      setPageData({
        eyebrow: payload?.page?.eyebrow ?? '',
        title: payload?.page?.title ?? '',
        subtitle: payload?.page?.subtitle ?? '',
      })
      setBlocks((payload?.blocks ?? []).map((block) => ({ clientId: `id-${block.id}`, ...block })))
      setStatus(`${meta.label} loaded`)
    }

    load()
  }, [slug, meta.label])

  const saveEditor = () => {
    setBlocks((prev) => {
      const next = {
        ...editorBlock,
        sort_order: Number.isFinite(editorBlock.sort_order) ? editorBlock.sort_order : nextOrder,
      }
      const idx = prev.findIndex((block) => block.clientId === editorBlock.clientId)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = next
        return copy
      }
      return [...prev, next]
    })
    setStatus('Draft updated locally. Save changes to publish.')
    setEditorOpen(false)
  }

  const saveAll = async () => {
    setIsSaving(true)
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setIsSaving(false)
      setStatus('You are not signed in.')
      return
    }

    const response = await fetch(`/api/cms/docs/${slug}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...pageData,
        blocks: sortedBlocks.map(({ sort_order, heading, description, body }) => ({
          sort_order,
          heading,
          description,
          body,
        })),
      }),
    })
    const payload = (await response.json().catch(() => null)) as Payload | null
    setIsSaving(false)
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to save docs page.')
      return
    }

    setStatus(`${meta.label} saved`)
    setConfirmOpen(false)
    toast({ title: 'Saved', description: `${meta.label} updated successfully.` })
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/docs" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Docs
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">{meta.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="max-w-5xl space-y-6 rounded-lg border border-border bg-white p-8 shadow-xs">
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Eyebrow</label>
          <input
            value={pageData.eyebrow}
            onChange={(e) => setPageData((prev) => ({ ...prev, eyebrow: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Title</label>
          <input
            value={pageData.title}
            onChange={(e) => setPageData((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label>
          <textarea
            value={pageData.subtitle}
            onChange={(e) => setPageData((prev) => ({ ...prev, subtitle: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Heading</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground">Description</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedBlocks.map((block) => (
              <tr key={block.clientId} className="border-b border-border last:border-b-0">
                <td className="px-5 py-4 text-sm">{block.sort_order}</td>
                <td className="px-5 py-4 text-sm">{block.heading}</td>
                <td className="px-5 py-4 text-sm">{block.description}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => { setEditorBlock(block); setEditorOpen(true) }}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => setBlocks((prev) => prev.filter((x) => x.clientId !== block.clientId))}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => { setEditorBlock(emptyBlock(nextOrder)); setEditorOpen(true) }}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
      >
        <Plus size={16} />
        Add Block
      </button>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Save ${meta.label}?`}
        description={`This will update the ${meta.label.toLowerCase()} page on the live site.`}
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={saveAll}
        onCancel={() => setConfirmOpen(false)}
      />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
            <DialogDescription>Update heading, description, and body text.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
              <input
                value={editorBlock.heading}
                onChange={(e) => setEditorBlock((prev) => ({ ...prev, heading: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Description</label>
              <input
                value={editorBlock.description}
                onChange={(e) => setEditorBlock((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Body</label>
              <RichTextEditor
                value={editorBlock.body}
                onChange={(body) => setEditorBlock((prev) => ({ ...prev, body }))}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditorOpen(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
              Cancel
            </button>
            <button onClick={saveEditor} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
              Update Item
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
