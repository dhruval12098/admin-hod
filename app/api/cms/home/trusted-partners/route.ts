import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/cms-auth'

const sectionKey = 'home_trusted_partners'

type TrustedPartnerLogoPayload = {
  name?: string
  logo_path?: string
  logo_alt?: string | null
  link_url?: string | null
  display_order?: number
  status?: string
}

export async function GET(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const { data: section, error: sectionError } = await access.adminClient
    .from('home_trusted_partners_section')
    .select('id, heading, is_enabled')
    .eq('section_key', sectionKey)
    .maybeSingle()

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  const { data: logos, error: logosError } = section?.id
    ? await access.adminClient
        .from('home_trusted_partner_logos')
        .select('id, name, logo_path, logo_alt, link_url, display_order, status')
        .eq('section_id', section.id)
        .order('display_order', { ascending: true })
    : { data: [], error: null }

  if (logosError) return NextResponse.json({ error: logosError.message }, { status: 500 })
  return NextResponse.json({ section, logos: logos ?? [] })
}

export async function POST(request: Request) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const { data: section, error: sectionError } = await access.adminClient
    .from('home_trusted_partners_section')
    .upsert({
      section_key: sectionKey,
      heading: body.heading || 'Trusted Partners',
      is_enabled: body.is_enabled ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'section_key' })
    .select('id, heading, is_enabled')
    .single()

  if (sectionError) return NextResponse.json({ error: sectionError.message }, { status: 500 })

  const logos: TrustedPartnerLogoPayload[] = Array.isArray(body.logos) ? body.logos : []
  const { error: deleteError } = await access.adminClient
    .from('home_trusted_partner_logos')
    .delete()
    .eq('section_id', section.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (logos.length) {
    const rows = logos
      .filter((logo) => logo?.name && logo?.logo_path)
      .map((logo, index) => ({
        section_id: section.id,
        name: logo.name,
        logo_path: logo.logo_path,
        logo_alt: logo.logo_alt || null,
        link_url: logo.link_url || null,
        display_order: Number(logo.display_order) || index + 1,
        status: logo.status || 'active',
      }))

    if (rows.length) {
      const { error: insertError } = await access.adminClient.from('home_trusted_partner_logos').insert(rows)
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ section })
}
