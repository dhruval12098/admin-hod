import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { HeroSlideEditorClient, type HeroSlide } from './hero-slide-editor-client'
import { loadHomeGroup1Snapshot } from '@/lib/cms-home-group1-save'

export default async function HeroSlideEditorPage({ params }: { params: Promise<{ slideId: string }> }) {
  const { slideId } = await params
  const id = Number(slideId)
  if (!Number.isSafeInteger(id) || id < 1) notFound()

  const snapshot = await loadHomeGroup1Snapshot(createSupabaseAdminClient(), 'hero')
  const initialSlide = snapshot.items.find((item) => Number(item.id) === id)
  if (!initialSlide) notFound()

  return <HeroSlideEditorClient
    initialSlide={{
      id: Number(initialSlide.id),
      hero_id: Number(initialSlide.hero_id),
      sort_order: Number(initialSlide.sort_order),
      image_path: String(initialSlide.image_path ?? ''),
      mobile_image_path: String(initialSlide.mobile_image_path ?? ''),
      headline: String(initialSlide.headline ?? ''),
      subtitle: String(initialSlide.subtitle ?? ''),
      button_text: String(initialSlide.button_text ?? ''),
      button_link: String(initialSlide.button_link ?? ''),
    } satisfies HeroSlide}
    initialItems={snapshot.items.map((item) => ({
      id: Number(item.id),
      hero_id: Number(item.hero_id),
      sort_order: Number(item.sort_order),
      image_path: String(item.image_path ?? ''),
      mobile_image_path: String(item.mobile_image_path ?? ''),
      headline: String(item.headline ?? ''),
      subtitle: String(item.subtitle ?? ''),
      button_text: String(item.button_text ?? ''),
      button_link: String(item.button_link ?? ''),
    }))}
    initialSection={{
      slider_enabled: Boolean(snapshot.section?.slider_enabled),
      seo_title: String(snapshot.section?.seo_title ?? ''),
      seo_description: String(snapshot.section?.seo_description ?? ''),
    }}
    initialRevision={snapshot.revision}
  />
}
