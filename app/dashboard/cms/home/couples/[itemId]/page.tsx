'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { emptyCouple, loadCouples, saveCouples, uploadCoupleImage, type CoupleItem, type CoupleSection } from '@/lib/couples-cms'

export default function CoupleItemEditorPage() {
  const params = useParams<{ itemId: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const itemId = Array.isArray(params?.itemId) ? params.itemId[0] : params?.itemId
  const isNew = itemId === 'new'

  const [section, setSection] = useState<CoupleSection | null>(null)
  const [items, setItems] = useState<CoupleItem[]>([])
  const [form, setForm] = useState<CoupleItem | null>(null)
  const [status, setStatus] = useState('Loading couple...')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const nextOrder = useMemo(() => Math.max(...items.map((item) => item.sort_order), 0) + 1, [items])

  useEffect(() => {
    void (async () => {
      const result = await loadCouples()
      if ('error' in result) {
        setStatus(result.error ?? 'Unable to load couples.')
        return
      }

      setSection(result.section)
      setItems(result.items)

      if (isNew) {
        setForm(emptyCouple(Math.max(...result.items.map((item) => item.sort_order), 0) + 1))
        setStatus('Ready to add a new couple')
        return
      }

      const matchedItem = result.items.find((item) => String(item.id) === itemId)
      if (!matchedItem) {
        setStatus('Couple not found.')
        return
      }

      setForm(matchedItem)
      setStatus('Couple loaded')
    })()
  }, [isNew, itemId])

  const updateField = <K extends keyof CoupleItem>(key: K, value: CoupleItem[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const save = async () => {
    if (!section || !form) return
    setIsSaving(true)

    const normalized = { ...form, sort_order: Number.isFinite(form.sort_order) ? form.sort_order : nextOrder }
    const nextItems = isNew
      ? [...items, normalized]
      : items.map((item) => (item.clientId === normalized.clientId ? normalized : item))

    const result = await saveCouples(
      {
        eyebrow: section.eyebrow,
        heading: section.heading,
        subtitle: section.subtitle,
      },
      nextItems,
    )

    setIsSaving(false)
    if ('error' in result) {
      setStatus(result.error ?? 'Unable to save couple.')
      return
    }

    setConfirmOpen(false)
    toast({ title: 'Saved', description: `Couple ${isNew ? 'created' : 'updated'} successfully.` })
    router.push('/dashboard/cms/home/couples')
    router.refresh()
  }

  const remove = async () => {
    if (!section || !form || isNew) return
    setIsSaving(true)

    const result = await saveCouples(
      {
        eyebrow: section.eyebrow,
        heading: section.heading,
        subtitle: section.subtitle,
      },
      items.filter((item) => item.clientId !== form.clientId),
    )

    setIsSaving(false)
    if ('error' in result) {
      setStatus(result.error ?? 'Unable to delete couple.')
      return
    }

    setDeleteOpen(false)
    toast({ title: 'Deleted', description: 'Couple removed successfully.' })
    router.push('/dashboard/cms/home/couples')
    router.refresh()
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    setStatus('Uploading image...')
    const result = await uploadCoupleImage(file)
    setUploading(false)

    if ('error' in result) {
      setStatus(result.error ?? 'Unable to upload image.')
      return
    }

    updateField('image_path', result.path)
    setStatus('Image uploaded successfully')
  }

  if (!form) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Link href="/dashboard/cms/home/couples" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
            <ArrowLeft size={16} />
            Back to Couples
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-white p-6 text-sm text-muted-foreground">{status}</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard/cms/home/couples" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={16} />
          Back to Couples
        </Link>
        {!isNew ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        ) : null}
      </div>

      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">{isNew ? 'Add Couple' : 'Edit Couple'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the homepage card and story content on a dedicated page.</p>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </div>

      <div className="max-w-4xl space-y-4 rounded-lg border border-border bg-white p-6 shadow-xs">
        <Field label="Sort Order">
          <input type="number" value={form.sort_order} onChange={(e) => updateField('sort_order', Number(e.target.value) || 1)} className={inputClassName} />
        </Field>
        <Field label="Names">
          <input value={form.names} onChange={(e) => updateField('names', e.target.value)} className={inputClassName} />
        </Field>
        <Field label="Location">
          <input value={form.location} onChange={(e) => updateField('location', e.target.value)} className={inputClassName} />
        </Field>
        <Field label="Story">
          <textarea value={form.story} onChange={(e) => updateField('story', e.target.value)} rows={5} className={inputClassName} />
        </Field>
        <Field label="Product Name">
          <input value={form.product_name} onChange={(e) => updateField('product_name', e.target.value)} className={inputClassName} />
        </Field>
        <Field label="Product Link">
          <input value={form.product_link} onChange={(e) => updateField('product_link', e.target.value)} placeholder="/shop/product-slug or https://..." className={inputClassName} />
        </Field>
        <Field label="Product Detail">
          <input value={form.product_detail} onChange={(e) => updateField('product_detail', e.target.value)} className={inputClassName} />
        </Field>
        <Field label="Image">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
              <Upload size={14} />
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUpload(file)
                }}
              />
            </label>
            <span className="text-xs text-muted-foreground">{form.image_path || 'No image uploaded yet'}</span>
          </div>
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setConfirmOpen(true)} disabled={isSaving} className={primaryButtonClassName}>
            {isSaving ? 'Saving...' : isNew ? 'Create Couple' : 'Save Changes'}
          </button>
          <Link href="/dashboard/cms/home/couples" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary">
            Cancel
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={isNew ? 'Create couple?' : 'Save changes?'}
        description="This will update the live homepage couples section."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={isSaving}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete couple?"
        description={`This will remove ${form.names || 'this couple'} from the homepage section.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        isLoading={isSaving}
        onConfirm={remove}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputClassName = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm'
const primaryButtonClassName = 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-70'
