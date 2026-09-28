import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { faqCategoryDeleteSchema, faqCategorySaveSchema } from '@/lib/cms-support-schemas'

function categoryError(error: { code?: string }) {
  if (error.code === 'PGRST202' || error.code === '42883') return NextResponse.json({ error: 'FAQ categories are awaiting their database update. Existing content was not changed.' }, { status: 503 })
  if (error.code === 'P0002') return NextResponse.json({ error: 'FAQ category not found.' }, { status: 404 })
  if (error.code === '40001') return NextResponse.json({ error: 'This FAQ category changed after you opened it. Reload before continuing.' }, { status: 409 })
  if (error.code === '23503') return NextResponse.json({ error: 'Remove this category from its FAQs and document page before deleting it.' }, { status: 409 })
  if (error.code === '23505') return NextResponse.json({ error: 'An FAQ category with this name or slug already exists.' }, { status: 409 })
  if (['22023', '22P02', '23502', '23514'].includes(error.code ?? '')) return NextResponse.json({ error: 'The FAQ category contains invalid or conflicting data.' }, { status: 400 })
  return NextResponse.json({ error: 'Unable to update the FAQ category. No partial changes were committed.' }, { status: 500 })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const parsed = faqCategorySaveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid FAQ category.' }, { status: 400 })
  const { data, error } = await access.adminClient.rpc('cms_save_support_faq_category_v1', {
    p_actor_id: access.user.id, p_request_id: parsed.data.request_id, p_expected_revision: parsed.data.expected_revision,
    p_id: parsed.data.id, p_item: parsed.data.item,
  })
  if (error) return categoryError(error)
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const parsed = faqCategoryDeleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Reload this FAQ category before deleting it.' }, { status: 409 })
  const { data, error } = await access.adminClient.rpc('cms_delete_support_faq_category_v1', {
    p_actor_id: access.user.id, p_request_id: parsed.data.request_id, p_expected_revision: parsed.data.expected_revision, p_id: parsed.data.id,
  })
  if (error) return categoryError(error)
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
