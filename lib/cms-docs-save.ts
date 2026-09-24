import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { assertAdmin } from './cms-auth'

type Access = Exclude<Awaited<ReturnType<typeof assertAdmin>>, { error: NextResponse }>
const id = z.union([z.number().int().positive(), z.string().regex(/^[1-9][0-9]*$/)]).transform(String)

export const docsSaveSchema = z.object({
  request_id: z.string().uuid(),
  expected_revision: z.string().regex(/^[a-f0-9]{32}$/),
  page: z.object({
    title: z.string().trim().min(1).max(500),
    eyebrow: z.string().trim().min(1).max(500),
    subtitle: z.string().trim().min(1).max(10_000),
    faq_category_id: z.union([z.number().int().positive(), z.null()]).optional(),
  }).strict(),
  blocks: z.array(z.object({
    id: id.optional(),
    heading: z.string().max(10_000),
    description: z.string().max(50_000),
    body: z.string().max(1_000_000),
  }).strict().refine((block) => Boolean(block.heading.trim() || block.description.trim() || block.body.trim()), 'Every block must contain content.')).max(100),
  deleted_block_ids: z.array(id).max(100),
}).strict().superRefine((payload, context) => {
  const ids = payload.blocks.flatMap((block) => block.id ? [block.id] : [])
  if (new Set(ids).size !== ids.length || new Set(payload.deleted_block_ids).size !== payload.deleted_block_ids.length
    || payload.deleted_block_ids.some((deleted) => ids.includes(deleted))) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'A block ID is invalid or duplicated.' })
  }
})

function docsError(error: { code?: string; message?: string }, action: 'load' | 'save') {
  if (error.code === 'PGRST202' || error.code === '42883') return NextResponse.json({ error: 'Docs are awaiting their database update. Existing content was not changed.' }, { status: 503 })
  if (error.code === 'P0002') return NextResponse.json({ error: 'Docs page not found.' }, { status: 404 })
  if (error.code === '40001') return NextResponse.json({ error: error.message }, { status: 409 })
  if (['22023', '22P02', '23503', '23505', '23514'].includes(error.code ?? '')) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ error: `Unable to ${action} this page. No partial changes were committed.` }, { status: 500 })
}

export async function loadCmsDocsSnapshot(client: Access['adminClient'], slug: string) {
  const { data, error } = await client.rpc('cms_docs_snapshot_v1', { p_slug: slug })
  if (error) return { response: docsError(error, 'load') }
  return { data: data as { page: Record<string, unknown>; blocks: Array<Record<string, unknown>>; revision: string } }
}

export async function saveCmsDocs(access: Access, slug: string, input: unknown) {
  const parsed = docsSaveSchema.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid docs payload.' }, { status: 400 })
  const { data, error } = await access.adminClient.rpc('cms_save_docs_page_v1', {
    p_actor_id: access.user.id,
    p_request_id: parsed.data.request_id,
    p_slug: slug,
    p_expected_revision: parsed.data.expected_revision,
    p_page: parsed.data.page,
    p_blocks: parsed.data.blocks,
    p_deleted_block_ids: parsed.data.deleted_block_ids,
  })
  if (error) return docsError(error, 'save')
  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } })
}
