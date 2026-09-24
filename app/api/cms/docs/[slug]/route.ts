import { NextResponse } from 'next/server'
import { buildAdminClient, assertAdmin } from '@/lib/cms-auth'
import { loadCmsDocsSnapshot, saveCmsDocs } from '@/lib/cms-docs-save'

export const dynamic = 'force-dynamic'
const allowedSlugs = new Set(['terms', 'privacy-policy', 'shipping', 'returns'])

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!allowedSlugs.has(slug)) return NextResponse.json({ error: 'Docs page not found.' }, { status: 404 })
  const adminClient = buildAdminClient()
  if (!adminClient) return NextResponse.json({ error: 'Missing Supabase env vars.' }, { status: 500 })
  const snapshot = await loadCmsDocsSnapshot(adminClient, slug)
  if (snapshot.response) return snapshot.response

  if (slug !== 'returns') return NextResponse.json(snapshot.data, { headers: { 'Cache-Control': 'no-store' } })
  const { data: faqCategories, error } = await adminClient.from('support_faq_categories')
    .select('id, name, slug, image_path, image_alt, is_active').order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: 'Unable to load FAQ categories.' }, { status: 500 })
  return NextResponse.json({ ...snapshot.data, faqCategories: faqCategories ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { slug } = await params
  if (!allowedSlugs.has(slug)) return NextResponse.json({ error: 'Docs page not found.' }, { status: 404 })
  return saveCmsDocs(access, slug, await request.json().catch(() => null))
}
