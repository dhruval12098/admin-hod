import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { DiamondInfoEditorClient, type DiamondInfoInitialData } from './diamond-info-editor-client'

async function getDiamondInfoInitialData(): Promise<DiamondInfoInitialData> {
  const adminClient = createSupabaseAdminClient()
  const [{ data, error }, { data: configData, error: configError }] = await Promise.all([
    adminClient
      .from('diamond_info_sections')
      .select('sort_order, label, heading, paragraph')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('diamond_info_config')
      .select('video_enabled, video_path, video_poster_path')
      .eq('section_key', 'home_diamond_info')
      .maybeSingle(),
  ])

  const isMissingConfigTable =
    configError?.code === 'PGRST205' ||
    configError?.message?.includes("Could not find the table 'public.diamond_info_config'")

  if (error) throw new Error(error.message)
  if (configError && !isMissingConfigTable) throw new Error(configError.message)

  const items = data?.length
    ? data
    : [
        { sort_order: 1, label: '', heading: '', paragraph: '' },
        { sort_order: 2, label: '', heading: '', paragraph: '' },
        { sort_order: 3, label: '', heading: '', paragraph: '' },
      ]

  return {
    items,
    config: {
      video_enabled: isMissingConfigTable ? false : (configData?.video_enabled ?? false),
      video_path: isMissingConfigTable ? '' : (configData?.video_path ?? ''),
      video_poster_path: isMissingConfigTable ? '' : (configData?.video_poster_path ?? ''),
    },
  }
}

export default async function DiamondInfoEditorPage() {
  const initialData = await getDiamondInfoInitialData()
  return <DiamondInfoEditorClient initialData={initialData} />
}
