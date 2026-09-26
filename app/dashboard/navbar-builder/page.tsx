import { unstable_noStore as noStore } from 'next/cache'
import { NavbarBuilderOverview } from '@/components/navbar-builder-editor'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadNavbarBuilderData } from '@/lib/navbar-data'

export const dynamic = 'force-dynamic'

export default async function NavbarBuilderPage() {
  noStore()
  const initialData = await loadNavbarBuilderData(createSupabaseAdminClient())
  return <NavbarBuilderOverview initialData={initialData} />
}
