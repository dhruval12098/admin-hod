import { unstable_noStore as noStore } from 'next/cache'
import { NavbarItemEditor } from '@/components/navbar-builder-editor'
import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { loadNavbarBuilderData } from '@/lib/navbar-data'

export const dynamic = 'force-dynamic'

export default async function NavbarBuilderItemPage({ params }: { params: Promise<{ id: string }> }) {
  noStore()
  const { id } = await params
  const initialData = await loadNavbarBuilderData(createSupabaseAdminClient())
  return <NavbarItemEditor itemId={id} initialData={initialData} />
}
