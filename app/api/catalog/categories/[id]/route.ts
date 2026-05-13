import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

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

  const updatePayload = existingCategory?.is_system_locked
    ? {
        banner_desktop_image_path: body.banner_desktop_image_path ?? null,
        banner_mobile_image_path: body.banner_mobile_image_path ?? null,
        banner_title: body.banner_title ?? null,
        banner_subtitle: body.banner_subtitle ?? null,
        banner_cta_label: body.banner_cta_label ?? null,
        banner_cta_link: body.banner_cta_link ?? null,
        banner_enabled: body.banner_enabled ?? false,
      }
    : {
        code: body.code,
        name: body.name,
        slug: body.slug,
        show_in_nav: body.show_in_nav ?? true,
        nav_type: body.show_in_nav === false ? null : body.nav_type ?? null,
        direct_link_url: body.direct_link_url ?? null,
        banner_desktop_image_path: body.banner_desktop_image_path ?? null,
        banner_mobile_image_path: body.banner_mobile_image_path ?? null,
        banner_title: body.banner_title ?? null,
        banner_subtitle: body.banner_subtitle ?? null,
        banner_cta_label: body.banner_cta_label ?? null,
        banner_cta_link: body.banner_cta_link ?? null,
        banner_enabled: body.banner_enabled ?? false,
        display_order: body.display_order ?? 0,
        status: body.status ?? 'active',
      }

  const { data, error } = await access.adminClient
    .from('catalog_categories')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
  return NextResponse.json({ ok: true })
}
