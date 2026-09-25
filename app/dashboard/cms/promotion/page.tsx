import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadCmsRelationalSnapshot } from '@/lib/cms-relational-save'
import { PromotionEditorClient, type PromotionInitialData } from './promotion-editor-client'

async function getPromotionInitialData() {
  const adminClient = createSupabaseAdminClient()
  const [snapshot, { data, error }, { data: coupons, error: couponsError }] = await Promise.all([
    loadCmsRelationalSnapshot(adminClient, 'promotion'),
    adminClient.from('promotion_popup').select('*').eq('section_key', 'global_promotion_popup').maybeSingle(),
    adminClient.from('coupons').select('id, code, title, is_active, usage_limit, usage_count').eq('is_active', true).order('created_at', { ascending: false }),
  ])
  if (error) throw new Error(error.message)
  if (couponsError) throw new Error(couponsError.message)

  let questions = snapshot.items as PromotionInitialData['item']['questions']
  let responses: PromotionInitialData['responses'] = []
  if (data?.id != null) {
    const responseResult = await adminClient.from('promotion_popup_responses').select('id, email, answers, coupon_revealed, revealed_at, created_at').eq('promotion_id', data.id).order('created_at', { ascending: false }).limit(50)
    if (!responseResult.error) responses = (responseResult.data ?? []).map((response) => ({
      id: Number(response.id), email: response.email ?? null,
      answers: response.answers && typeof response.answers === 'object' && !Array.isArray(response.answers) ? response.answers as Record<string, string | string[]> : {},
      coupon_revealed: Boolean(response.coupon_revealed), revealed_at: response.revealed_at ?? null, created_at: response.created_at,
    }))
  }
  if (!questions.length) questions = [{ id: null, field_key: 'email', question: 'What is your email address?', input_type: 'email', options: [], allow_multiple: false, validation_pattern: '', validation_message: 'Enter a valid email address.', is_required: true, is_active: true, sort_order: 0 }]

  const parent = snapshot.parent
  const initialData: PromotionInitialData = {
    item: parent ? {
      label: String(parent.label ?? ''), title: String(parent.title ?? ''), description: String(parent.description ?? ''), cta_text: String(parent.cta_text ?? ''), cta_link: String(parent.cta_link ?? ''), cta_action: parent.cta_action === 'reveal_coupon' ? 'reveal_coupon' : 'redirect', selected_coupon_id: parent.selected_coupon_id == null ? null : Number(parent.selected_coupon_id), image_path: String(parent.image_path ?? ''), mobile_image_path: String(parent.mobile_image_path ?? ''), image_alt: String(parent.image_alt ?? ''), image_only_mode: Boolean(parent.image_only_mode), is_active: Boolean(parent.is_active), show_once_per_session: parent.show_once_per_session !== false, questions,
    } : {
      label: '', title: '', description: '', cta_text: '', cta_link: '', cta_action: 'redirect', selected_coupon_id: null, image_path: '', mobile_image_path: '', image_alt: '', image_only_mode: false, is_active: true, show_once_per_session: true, questions,
    },
    responses,
    coupons: (coupons ?? []).map((coupon) => ({ id: Number(coupon.id), code: coupon.code ?? '', title: coupon.title ?? '', usage_limit: coupon.usage_limit == null ? null : Number(coupon.usage_limit), usage_count: Number(coupon.usage_count ?? 0) })),
  }
  return { initialData, revision: snapshot.revision }
}

export default async function PromotionPage() {
  const { initialData, revision } = await getPromotionInitialData()
  return <PromotionEditorClient initialData={initialData} initialRevision={revision} />
}
