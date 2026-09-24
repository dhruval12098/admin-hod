import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'
import { invalidateProductListReferenceData } from '@/lib/product-list-reference-cache'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const { data: existingCategory, error: existingCategoryError } = await access.adminClient
    .from('catalog_categories')
    .select('id, name, is_system_locked')
    .eq('id', id)
    .single()

  if (existingCategoryError) return NextResponse.json({ error: existingCategoryError.message }, { status: 500 })

  if (existingCategory?.is_system_locked) {
    const allowedBannerOnly =
      typeof body.banner_enabled === 'boolean' ||
      'banner_desktop_image_path' in body ||
      'banner_mobile_image_path' in body ||
      'banner_desktop_image_alt' in body ||
      'banner_mobile_image_alt' in body ||
      'banner_title' in body ||
      'banner_subtitle' in body ||
      'banner_cta_label' in body ||
      'banner_cta_link' in body

    if (!allowedBannerOnly) {
      return NextResponse.json(
        { error: `${existingCategory.name} is a protected system category and cannot be edited here.` },
        { status: 403 }
      )
    }
  }

  const bannerFields = [
    'banner_desktop_image_path',
    'banner_mobile_image_path',
    'banner_desktop_image_alt',
    'banner_mobile_image_alt',
    'banner_title',
    'banner_subtitle',
    'banner_cta_label',
    'banner_cta_link',
    'banner_enabled',
  ] as const
  const updatePayload: Record<string, unknown> = {}

  for (const field of bannerFields) {
    if (field in body) updatePayload[field] = body[field]
  }

  if (!existingCategory?.is_system_locked) {
    const editableFields = ['code', 'name', 'slug', 'display_order', 'status'] as const
    for (const field of editableFields) {
      if (field in body) updatePayload[field] = body[field]
    }

    if ('show_in_nav' in body) updatePayload.show_in_nav = body.show_in_nav
    if (body.show_in_nav === false) {
      updatePayload.nav_type = null
      updatePayload.direct_link_url = null
    } else {
      if ('nav_type' in body) updatePayload.nav_type = body.nav_type
      if ('direct_link_url' in body) updatePayload.direct_link_url = body.direct_link_url
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No editable fields were provided.' }, { status: 400 })
  }

  const { data, error } = await access.adminClient
    .from('catalog_categories')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateProductListReferenceData()
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { id } = await params
  const { data: existingCategory, error: existingCategoryError } = await access.adminClient
    .from('catalog_categories')
    .select('id, name, is_system_locked')
    .eq('id', id)
    .single()

  if (existingCategoryError) return NextResponse.json({ error: existingCategoryError.message }, { status: 500 })

  if (existingCategory?.is_system_locked) {
    return NextResponse.json(
      { error: `${existingCategory.name} is a protected system category and cannot be deleted.` },
      { status: 403 }
    )
  }

  const { error } = await access.adminClient.from('catalog_categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateProductListReferenceData()
  return NextResponse.json({ ok: true })
}
