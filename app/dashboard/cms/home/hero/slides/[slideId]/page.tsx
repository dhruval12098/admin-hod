import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { HeroSlideEditorClient, type HeroSlide } from './hero-slide-editor-client'

const selectFields = 'id, hero_id, sort_order, image_path, mobile_image_path, headline, subtitle, button_text, button_link'

async function getHeroSlide(slideId: number): Promise<HeroSlide | null> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('homepage_hero_slider_items')
    .select(selectFields)
    .eq('id', slideId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    ...data,
    mobile_image_path: data.mobile_image_path ?? '',
    headline: data.headline ?? '',
    subtitle: data.subtitle ?? '',
    button_text: data.button_text ?? '',
    button_link: data.button_link ?? '',
  }
}

export default async function HeroSlideEditorPage({ params }: { params: Promise<{ slideId: string }> }) {
  const { slideId } = await params
  const id = Number(slideId)
  if (!Number.isSafeInteger(id) || id < 1) notFound()

  const initialSlide = await getHeroSlide(id)
  if (!initialSlide) notFound()

  return <HeroSlideEditorClient initialSlide={initialSlide} />
}
