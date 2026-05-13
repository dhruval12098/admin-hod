'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bold, Heading2, Heading3, Italic, List, ListOrdered, Pilcrow, Plus, Quote, Trash2, Upload } from 'lucide-react'
import { CmsSaveAction } from '@/components/cms-save-action'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

type BlogTag = { clientId: string; value: string }
type BlogContentBlock = {
  clientId: string
  id?: number
  block_type: 'text' | 'image' | 'heading' | 'quote'
  sort_order: number
  heading: string
  body_html: string
  image_path: string
  image_alt: string
  image_caption: string
  is_enabled: boolean
}

type BlogForm = {
  slug: string
  title: string
  title_html: string
  subtitle: string
  category: string
  author: string
  date_label: string
  read_time: string
  bg_key: string
  bg_color: string
  hero_image_path: string
  body_html: string
  is_published: boolean
  sort_order: number
}

type Payload = {
  post?: BlogForm & { id: number }
  tags?: Array<{ id: number; tag: string; sort_order: number }>
  content_blocks?: Array<{
    id: number
    block_type: 'text' | 'image' | 'heading' | 'quote'
    sort_order: number
    heading: string | null
    body_html: string | null
    image_path: string | null
    image_alt: string | null
    image_caption: string | null
    is_enabled: boolean | null
  }>
  error?: string
}

function createEmptyBlock(
  type: BlogContentBlock['block_type'],
  sortOrder: number
): BlogContentBlock {
  return {
    clientId: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    block_type: type,
    sort_order: sortOrder,
    heading: '',
    body_html: type === 'text' ? '<p></p>' : '',
    image_path: '',
    image_alt: '',
    image_caption: '',
    is_enabled: true,
  }
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Placeholder.configure({ placeholder: 'Write the blog body here...' }),
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[320px] w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:border-primary prose prose-sm max-w-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) editor.commands.setContent(value || '<p></p>')
  }, [editor, value])

  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex flex-wrap gap-2 border-b border-border bg-secondary/30 p-2">
        <button type="button" onClick={() => editor?.chain().focus().setParagraph().run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Pilcrow size={13} />Paragraph</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Heading2 size={13} />H2</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Heading3 size={13} />H3</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Bold size={13} />Bold</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Italic size={13} />Italic</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><List size={13} />Bullet</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><ListOrdered size={13} />Numbered</button>
        <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Quote size={13} />Quote</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

const emptyForm: BlogForm = {
  slug: '',
  title: '',
  title_html: '',
  subtitle: '',
  category: '',
  author: '',
  date_label: '',
  read_time: '',
  bg_key: 'bg-0',
  bg_color: '#EEF1F8',
  hero_image_path: '',
  body_html: '<p></p>',
  is_published: true,
  sort_order: 1,
}

export function BlogEditorPage({ mode, id }: { mode: 'create' | 'edit'; id?: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [form, setForm] = useState<BlogForm>(emptyForm)
  const [tags, setTags] = useState<BlogTag[]>([{ clientId: `tag-${Date.now()}`, value: '' }])
  const [contentBlocks, setContentBlocks] = useState<BlogContentBlock[]>([])
  const [status, setStatus] = useState(mode === 'create' ? 'Create a new blog post.' : 'Loading blog post...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const cleanedTags = useMemo(() => tags.map((tag) => tag.value.trim()).filter(Boolean), [tags])

  useEffect(() => {
    if (mode !== 'edit' || !id) return

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) return setStatus('You are not signed in.')

      const response = await fetch(`/api/cms/blog/posts/${id}`, { headers: { authorization: `Bearer ${accessToken}` } })
      const payload = (await response.json().catch(() => null)) as Payload | null
      if (!response.ok || !payload?.post) return setStatus(payload?.error ?? 'Unable to load blog post.')

      setForm(payload.post)
      setTags((payload.tags ?? []).map((tag) => ({ clientId: `tag-${tag.id}`, value: tag.tag })))
      setContentBlocks(
        (payload.content_blocks ?? []).map((block, index) => ({
          clientId: `block-${block.id}`,
          id: block.id,
          block_type: block.block_type,
          sort_order: block.sort_order ?? index + 1,
          heading: block.heading ?? '',
          body_html: block.body_html ?? '',
          image_path: block.image_path ?? '',
          image_alt: block.image_alt ?? '',
          image_caption: block.image_caption ?? '',
          is_enabled: block.is_enabled !== false,
        }))
      )
      setStatus('Blog post loaded')
    }

    load()
  }, [mode, id])

  const uploadImage = async (file: File) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return setStatus('You are not signed in.')

    setUploading(true)
    setStatus('Uploading blog image...')
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/cms/uploads/blog', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as { path?: string; error?: string } | null
    setUploading(false)
    if (!response.ok || !payload?.path) return setStatus(payload?.error ?? 'Unable to upload image.')

    setForm((prev) => ({ ...prev, hero_image_path: payload.path ?? '' }))
    setStatus('Blog image uploaded successfully')
  }

  const uploadBlockImage = async (clientId: string, file: File) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return setStatus('You are not signed in.')

    setUploading(true)
    setStatus('Uploading block image...')
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/cms/uploads/blog', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: formData,
    })

    const payload = (await response.json().catch(() => null)) as { path?: string; error?: string } | null
    setUploading(false)
    if (!response.ok || !payload?.path) return setStatus(payload?.error ?? 'Unable to upload image.')

    setContentBlocks((prev) =>
      prev.map((block) => (block.clientId === clientId ? { ...block, image_path: payload.path ?? '' } : block))
    )
    setStatus('Block image uploaded successfully')
  }

  const save = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return setStatus('You are not signed in.')

    setIsSaving(true)
    const endpoint = mode === 'create' ? '/api/cms/blog/posts' : `/api/cms/blog/posts/${id}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        ...form,
        tags: cleanedTags,
        content_blocks: contentBlocks.map((block, index) => ({
          id: block.id,
          block_type: block.block_type,
          sort_order: index + 1,
          heading: block.heading,
          body_html: block.body_html,
          image_path: block.image_path,
          image_alt: block.image_alt,
          image_caption: block.image_caption,
          is_enabled: block.is_enabled,
        })),
      }),
    })

    const payload = (await response.json().catch(() => null)) as { id?: number; error?: string } | null
    setIsSaving(false)
    if (!response.ok) return setStatus(payload?.error ?? 'Unable to save blog post.')

    setConfirmOpen(false)
    setStatus('Blog post saved')
    toast({ title: 'Saved', description: 'Blog post updated successfully.' })

    if (mode === 'create' && payload?.id) {
      router.push(`/dashboard/cms/blog/${payload.id}`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Blog
        </Link>
        <CmsSaveAction onClick={() => setConfirmOpen(true)} isSaving={isSaving} position="inline" />
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">{mode === 'create' ? 'Create Blog' : 'Edit Blog'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage all blog fields, hero image, tags, and article body.</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-white p-6 shadow-xs">
          <div><label className="mb-2 block text-sm font-semibold text-foreground">Slug</label><input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
          <div><label className="mb-2 block text-sm font-semibold text-foreground">Title</label><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
          <div><label className="mb-2 block text-sm font-semibold text-foreground">Styled Title HTML</label><textarea value={form.title_html} onChange={(e) => setForm((prev) => ({ ...prev, title_html: e.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
          <div><label className="mb-2 block text-sm font-semibold text-foreground">Subtitle</label><textarea value={form.subtitle} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} rows={4} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Category</label><input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Author</label><input value={form.author} onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Date Label</label><input value={form.date_label} onChange={(e) => setForm((prev) => ({ ...prev, date_label: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Read Time</label><input value={form.read_time} onChange={(e) => setForm((prev) => ({ ...prev, read_time: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Background Key</label><input value={form.bg_key} onChange={(e) => setForm((prev) => ({ ...prev, bg_key: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Background Color</label><input value={form.bg_color} onChange={(e) => setForm((prev) => ({ ...prev, bg_color: e.target.value }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
            <div><label className="mb-2 block text-sm font-semibold text-foreground">Sort Order</label><input type="number" value={form.sort_order} onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /></div>
            <label className="flex items-center gap-3 pt-8 text-sm font-semibold text-foreground"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))} className="h-4 w-4" />Published</label>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-white p-6 shadow-xs">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Hero Image</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                <Upload size={14} />
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) void uploadImage(file) }} />
              </label>
              <span className="text-xs text-muted-foreground">{form.hero_image_path || 'No image uploaded yet'}</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-semibold text-foreground">Tags</label>
              <button type="button" onClick={() => setTags((prev) => [...prev, { clientId: `tag-${Date.now()}-${prev.length}`, value: '' }])} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
                <Plus size={14} />
                Add Tag
              </button>
            </div>
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag.clientId} className="flex items-center gap-2">
                  <input value={tag.value} onChange={(e) => setTags((prev) => prev.map((item) => item.clientId === tag.clientId ? { ...item, value: e.target.value } : item))} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
                  <button type="button" onClick={() => setTags((prev) => prev.filter((item) => item.clientId !== tag.clientId))} className="rounded-lg border border-border px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-6xl rounded-lg border border-border bg-white p-6 shadow-xs">
        <label className="mb-3 block text-sm font-semibold text-foreground">Blog Body</label>
        <RichTextEditor value={form.body_html} onChange={(value) => setForm((prev) => ({ ...prev, body_html: value }))} />
      </div>

      <div className="mt-6 max-w-6xl rounded-lg border border-border bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground">Content Blocks</label>
            <p className="mt-1 text-xs text-muted-foreground">Add repeatable image, text, heading, or quote sections below the main article body.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['image', 'text', 'heading', 'quote'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setContentBlocks((prev) => [...prev, createEmptyBlock(type, prev.length + 1)])}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                <Plus size={14} />
                Add {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {contentBlocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No extra blocks added yet.
            </div>
          ) : null}

          {contentBlocks.map((block, index) => (
            <div key={block.clientId} className="rounded-lg border border-border bg-[#fcfcfd] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">
                  Block {index + 1} · {block.block_type}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setContentBlocks((prev) => prev.filter((entry) => entry.clientId !== block.clientId).map((entry, order) => ({ ...entry, sort_order: order + 1 })))
                    }
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {block.block_type === 'image' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Image</label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
                        <Upload size={14} />
                        {uploading ? 'Uploading...' : 'Upload Block Image'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0]
                            if (file) void uploadBlockImage(block.clientId, file)
                          }}
                        />
                      </label>
                      <span className="text-xs text-muted-foreground">{block.image_path || 'No image uploaded yet'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-foreground">Image Alt</label>
                    <input
                      value={block.image_alt}
                      onChange={(e) => setContentBlocks((prev) => prev.map((entry) => (entry.clientId === block.clientId ? { ...entry, image_alt: e.target.value } : entry)))}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-foreground">Image Caption</label>
                    <textarea
                      value={block.image_caption}
                      onChange={(e) => setContentBlocks((prev) => prev.map((entry) => (entry.clientId === block.clientId ? { ...entry, image_caption: e.target.value } : entry)))}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : block.block_type === 'heading' ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Heading</label>
                  <input
                    value={block.heading}
                    onChange={(e) => setContentBlocks((prev) => prev.map((entry) => (entry.clientId === block.clientId ? { ...entry, heading: e.target.value } : entry)))}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">{block.block_type === 'quote' ? 'Quote HTML' : 'Text HTML'}</label>
                  <RichTextEditor
                    value={block.body_html || '<p></p>'}
                    onChange={(value) =>
                      setContentBlocks((prev) => prev.map((entry) => (entry.clientId === block.clientId ? { ...entry, body_html: value } : entry)))
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={mode === 'create' ? 'Create blog post?' : 'Save blog post?'}
        description="This will update the blog content on the live site."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
