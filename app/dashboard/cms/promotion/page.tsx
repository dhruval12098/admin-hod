import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { PromotionEditorClient, type PromotionInitialData } from './promotion-editor-client'

async function getPromotionInitialData(): Promise<PromotionInitialData> {
  const adminClient = createSupabaseAdminClient()
  const [{ data, error }, { data: coupons, error: couponsError }] = await Promise.all([
    adminClient.from('promotion_popup').select('*').eq('section_key', 'global_promotion_popup').maybeSingle(),
    adminClient.from('coupons').select('id, code, title, is_active, usage_limit, usage_count').eq('is_active', true).order('created_at', { ascending: false }),
  ])

  if (error) throw new Error(error.message)
  if (couponsError) throw new Error(couponsError.message)

  return {
    item: data
      ? {
          label: data.label ?? '',
          title: data.title ?? '',
          description: data.description ?? '',
          cta_text: data.cta_text ?? '',
          cta_link: data.cta_link ?? '',
          cta_action: data.cta_action === 'reveal_coupon' ? 'reveal_coupon' : 'redirect',
          selected_coupon_id: data.selected_coupon_id == null ? null : Number(data.selected_coupon_id),
          image_path: data.image_path ?? '',
          mobile_image_path: data.mobile_image_path ?? '',
          image_alt: data.image_alt ?? '',
          image_only_mode: Boolean(data.image_only_mode),
          is_active: Boolean(data.is_active),
          show_once_per_session: data.show_once_per_session !== false,
        }
      : {
          label: '',
          title: '',
          description: '',
          cta_text: '',
          cta_link: '',
          cta_action: 'redirect',
          selected_coupon_id: null,
          image_path: '',
          mobile_image_path: '',
          image_alt: '',
          image_only_mode: false,
          is_active: true,
          show_once_per_session: true,
        },
    coupons: (coupons ?? []).map((coupon) => ({
      id: Number(coupon.id),
      code: coupon.code ?? '',
      title: coupon.title ?? '',
      usage_limit: coupon.usage_limit == null ? null : Number(coupon.usage_limit),
      usage_count: Number(coupon.usage_count ?? 0),
    })),
  }
}

export default async function PromotionPage() {
  const initialData = await getPromotionInitialData()
  return <PromotionEditorClient initialData={initialData} />
}
