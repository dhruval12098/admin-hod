import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { SupportFaqEditorClient, type SupportFaqInitialData } from './support-faq-editor-client'

async function getSupportFaqInitialData(): Promise<SupportFaqInitialData> {
  const adminClient = createSupabaseAdminClient()

  const [{ data: section, error: sectionError }, { data: catalogCategories, error: catalogError }] = await Promise.all([
    adminClient.from('support_faq_section').select('id, section_key, title, subtitle').eq('section_key', 'global_support_faq').maybeSingle(),
    adminClient.from('catalog_categories').select('id, name, slug').eq('status', 'active').order('display_order', { ascending: true }),
  ])

  if (sectionError) throw new Error(sectionError.message)
  if (catalogError) throw new Error(catalogError.message)

  if (!section) {
    return {
      section: { section_key: 'global_support_faq', title: 'Frequently Asked Questions', subtitle: '' },
      items: [],
      categories: [],
      catalogCategories: catalogCategories ?? [],
    }
  }

  let itemsResult = await adminClient
    .from('support_faq_items')
    .select('id, sort_order, question, answer, is_active, category_id, catalog_category_id')
    .eq('section_id', section.id)
    .order('sort_order', { ascending: true })

  if (itemsResult.error?.message?.includes('catalog_category_id')) {
    itemsResult = await adminClient
      .from('support_faq_items')
      .select('id, sort_order, question, answer, is_active, category_id')
      .eq('section_id', section.id)
      .order('sort_order', { ascending: true })
  }
  if (itemsResult.error) throw new Error(itemsResult.error.message)

  const { data: categories, error: categoriesError } = await adminClient
    .from('support_faq_categories')
    .select('id, name, slug, description, image_path, image_alt, sort_order, is_active')
    .order('sort_order', { ascending: true })

  if (categoriesError) throw new Error(categoriesError.message)
  const items = (itemsResult.data ?? []).map((item) => ({ ...item, catalog_category_id: 'catalog_category_id' in item ? item.catalog_category_id as string | null : null }))
  return { section, items, categories: categories ?? [], catalogCategories: catalogCategories ?? [] }
}

export default async function SupportFaqPage() {
  const initialData = await getSupportFaqInitialData()
  return <SupportFaqEditorClient initialData={initialData} />
}
