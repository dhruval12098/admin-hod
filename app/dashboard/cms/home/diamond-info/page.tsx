import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { DiamondInfoEditorClient, type DiamondInfoInitialData } from './diamond-info-editor-client'

async function getDiamondInfoInitialData(): Promise<DiamondInfoInitialData> {
  const adminClient = createSupabaseAdminClient()
  const [{ data: featuresData, error: featuresError }, { data: configData, error: configError }] = await Promise.all([
    adminClient
      .from('diamond_info_feature_items')
      .select('id, sort_order, icon_svg, title, description, is_active')
      .eq('section_key', 'home_diamond_info')
      .order('sort_order', { ascending: true }),
    adminClient
      .from('diamond_info_config')
      .select('video_enabled, video_path, video_poster_path, layout_mode, eyebrow, section_heading, section_subtext, cta_label, cta_link')
      .eq('section_key', 'home_diamond_info')
      .maybeSingle(),
  ])

  const isMissingConfigTable =
    configError?.code === 'PGRST205' ||
    configError?.message?.includes("Could not find the table 'public.diamond_info_config'")

  const isMissingFeatureTable =
    featuresError?.code === 'PGRST205' ||
    featuresError?.message?.includes("Could not find the table 'public.diamond_info_feature_items'")

  if (featuresError && !isMissingFeatureTable) throw new Error(featuresError.message)
  if (configError && !isMissingConfigTable) throw new Error(configError.message)

  return {
    features: isMissingFeatureTable
      ? []
      : (featuresData ?? []).map((feature) => ({
          id: feature.id,
          sort_order: feature.sort_order,
          icon_svg: feature.icon_svg ?? '',
          title: feature.title ?? '',
          description: feature.description ?? '',
          is_active: feature.is_active ?? true,
        })),
    config: {
      video_enabled: isMissingConfigTable ? true : (configData?.video_enabled ?? true),
      video_path: isMissingConfigTable ? '' : (configData?.video_path ?? ''),
      video_poster_path: isMissingConfigTable ? '' : (configData?.video_poster_path ?? ''),
      layout_mode: isMissingConfigTable ? 'split_video_text' : (configData?.layout_mode ?? 'split_video_text'),
      eyebrow: isMissingConfigTable ? '' : (configData?.eyebrow ?? ''),
      section_heading: isMissingConfigTable ? '' : (configData?.section_heading ?? ''),
      section_subtext: isMissingConfigTable ? '' : (configData?.section_subtext ?? ''),
      cta_label: isMissingConfigTable ? '' : (configData?.cta_label ?? ''),
      cta_link: isMissingConfigTable ? '' : (configData?.cta_link ?? ''),
    },
  }
}

export default async function DiamondInfoEditorPage() {
  const initialData = await getDiamondInfoInitialData()
  return <DiamondInfoEditorClient initialData={initialData} />
}
