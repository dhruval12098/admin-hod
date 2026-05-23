import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import {
  BespokeManufacturingEditorClient,
  type BespokeManufacturingInitialData,
} from '../../bespoke/manufacturing/bespoke-manufacturing-editor-client'

async function getAboutManufacturingInitialData(): Promise<BespokeManufacturingInitialData> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('bespoke_process_steps')
    .select('id, sort_order, step, eyebrow, title, description, image_path, media_type, media_path')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return {
    items: data ?? [],
  }
}

export default async function AboutManufacturingPage() {
  const initialData = await getAboutManufacturingInitialData()

  return (
    <BespokeManufacturingEditorClient
      initialData={initialData}
      copy={{
        backHref: '/dashboard/cms/about',
        backLabel: 'Back to About',
        title: 'About Manufacturing Steps',
        description: 'Manage the workshop cards shown on the About page',
        loadedStatus: 'About manufacturing steps loaded',
        emptyStatus: 'No About manufacturing steps found yet',
        savedStatus: 'About manufacturing steps saved',
        confirmTitle: 'Save About Manufacturing Steps?',
        confirmDescription: 'This will update the manufacturing section shown on the About page.',
      }}
    />
  )
}
