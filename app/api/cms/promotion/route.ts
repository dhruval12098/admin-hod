import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const allowedInputTypes = new Set(['text', 'email', 'phone', 'number', 'options'])
type SavedQuestion = { field_key: string; question: string; input_type: string; options: Array<{ id: string; label: string; value: string }>; allow_multiple: boolean; validation_pattern: string | null; validation_message: string | null; is_required: boolean; is_active: boolean; sort_order: number }

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { data, error } = await access.adminClient.from('promotion_popup').select('*').eq('section_key', 'global_promotion_popup').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const questions = data?.id ? await access.adminClient.from('promotion_popup_questions').select('*').eq('promotion_id', data.id).order('sort_order') : { data: [] }
  return NextResponse.json({ item: data ? { ...data, questions: questions.data ?? [] } : null })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const questions: SavedQuestion[] = (Array.isArray(body.questions) ? body.questions : []).map((question: Record<string, unknown>, index: number) => ({
    field_key: typeof question.field_key === 'string' ? question.field_key.trim().toLowerCase() : '',
    question: typeof question.question === 'string' ? question.question.trim() : '',
    input_type: allowedInputTypes.has(String(question.input_type)) ? String(question.input_type) : 'text',
    options: Array.isArray(question.options) ? question.options.map((option: any, optionIndex: number) => ({ id: String(option?.id ?? optionIndex), label: String(option?.label ?? option?.value ?? '').trim(), value: String(option?.value ?? option?.label ?? '').trim() })).filter((option: { label: string; value: string }) => option.label && option.value) : [],
    allow_multiple: question.input_type === 'options' && question.allow_multiple === true,
    validation_pattern: typeof question.validation_pattern === 'string' && question.validation_pattern.trim() ? question.validation_pattern.trim() : null,
    validation_message: typeof question.validation_message === 'string' && question.validation_message.trim() ? question.validation_message.trim() : null,
    is_required: question.is_required !== false,
    is_active: question.is_active !== false,
    sort_order: index,
  }))
  if (questions.some((question) => question.input_type === 'options' && question.options.length < 2)) return NextResponse.json({ error: 'Option questions need at least two answer options.' }, { status: 400 })
  if (!questions.length) return NextResponse.json({ error: 'Add at least one popup question.' }, { status: 400 })
  if (questions.some((question) => !/^[a-z][a-z0-9_]{1,49}$/.test(question.field_key) || !question.question)) return NextResponse.json({ error: 'Every question needs a label and a unique field key using letters, numbers, or underscores.' }, { status: 400 })
  if (new Set(questions.map((question) => question.field_key)).size !== questions.length) return NextResponse.json({ error: 'Question field keys must be unique.' }, { status: 400 })
  for (const question of questions) if (question.validation_pattern) { try { new RegExp(question.validation_pattern) } catch { return NextResponse.json({ error: `Invalid validation pattern for ${question.question}.` }, { status: 400 }) } }

  const payload = {
    section_key: 'global_promotion_popup', label: typeof body.label === 'string' ? body.label : '', title: typeof body.title === 'string' ? body.title : '', description: typeof body.description === 'string' ? body.description : '', cta_text: typeof body.cta_text === 'string' ? body.cta_text : '', cta_link: typeof body.cta_link === 'string' ? body.cta_link : '', cta_action: body.cta_action === 'reveal_coupon' ? 'reveal_coupon' : 'redirect', selected_coupon_id: body.cta_action === 'reveal_coupon' && body.selected_coupon_id != null && Number.isInteger(Number(body.selected_coupon_id)) && Number(body.selected_coupon_id) > 0 ? Number(body.selected_coupon_id) : null, image_path: typeof body.image_path === 'string' ? body.image_path : '', mobile_image_path: typeof body.mobile_image_path === 'string' ? body.mobile_image_path : '', image_alt: typeof body.image_alt === 'string' ? body.image_alt : '', image_only_mode: Boolean(body.image_only_mode), is_active: Boolean(body.is_active), show_once_per_session: body.show_once_per_session !== false,
  }
  if (payload.cta_action === 'redirect' && !payload.cta_link.trim()) return NextResponse.json({ error: 'A destination link is required for Redirect mode.' }, { status: 400 })
  if (payload.cta_action === 'reveal_coupon') {
    if (payload.selected_coupon_id == null) return NextResponse.json({ error: 'Select an active coupon for Reveal coupon mode.' }, { status: 400 })
    const { data: coupon, error: couponError } = await access.adminClient.from('coupons').select('id, usage_limit, usage_count').eq('id', payload.selected_coupon_id).eq('is_active', true).maybeSingle()
    if (couponError || !coupon || (coupon.usage_limit != null && Number(coupon.usage_count ?? 0) >= Number(coupon.usage_limit))) return NextResponse.json({ error: 'The selected coupon is unavailable or has reached its usage limit.' }, { status: 400 })
  }

  const { data: promotion, error } = await access.adminClient.from('promotion_popup').upsert(payload, { onConflict: 'section_key' }).select('id').single()
  if (error || !promotion) return NextResponse.json({ error: error?.message || 'Unable to save promotion.' }, { status: 500 })

  const { error: deleteError } = await access.adminClient.from('promotion_popup_questions').delete().eq('promotion_id', promotion.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  const { error: questionError } = await access.adminClient.from('promotion_popup_questions').insert(questions.map((question) => ({ ...question, promotion_id: promotion.id })))
  if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}