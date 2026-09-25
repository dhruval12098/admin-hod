import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCmsRelationalSnapshot } from '@/lib/cms-relational-save'
import { SupportFaqEditorClient, type SupportFaqInitialData } from './support-faq-editor-client'

async function getSupportFaqInitialData() {
  const adminClient = createSupabaseAdminClient()
  const [snapshot, { data: catalogCategories, error: catalogError }, { data: categories, error: categoriesError }] = await Promise.all([
    loadCmsRelationalSnapshot(adminClient, 'faq'),
    adminClient.from('catalog_categories').select('id, name, slug').eq('status', 'active').order('display_order', { ascending: true }),
    adminClient.from('support_faq_categories').select('id, name, slug, description, image_path, image_alt, sort_order, is_active').order('sort_order', { ascending: true }),
  ])
  if (catalogError) throw new Error(catalogError.message)
  if (categoriesError) throw new Error(categoriesError.message)
  if (!snapshot.parent) return { initialData: {
      section: { section_key: 'global_support_faq', title: 'Frequently Asked Questions', subtitle: '' },
      items: [],
      categories: categories ?? [],
      catalogCategories: catalogCategories ?? [],
    }, revision: snapshot.revision }
  return { initialData: { section: snapshot.parent, items: snapshot.items, categories: categories ?? [], catalogCategories: catalogCategories ?? [] } as SupportFaqInitialData, revision: snapshot.revision }
}

export default async function SupportFaqPage() {
  const { initialData, revision } = await getSupportFaqInitialData()
  return <SupportFaqEditorClient initialData={initialData} initialRevision={revision} />
}
