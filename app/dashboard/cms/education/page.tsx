import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { EducationListClient, type EducationListItem } from './education-list-client'

async function getEducationRows(): Promise<EducationListItem[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('education_posts')
    .select('id, slug, title, category, author, date_label, read_time, is_published, sort_order, updated_at')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as EducationListItem[]
}

export default async function EducationCMSPage() {
  return <EducationListClient initialItems={await getEducationRows()} />
}