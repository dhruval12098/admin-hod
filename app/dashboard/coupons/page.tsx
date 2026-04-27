import { createSupabaseAdminClient } from '@/lib/admin-supabase'
import { CouponsClient, type CouponRow } from './coupons-client'

async function getCoupons(): Promise<CouponRow[]> {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('coupons')
    .select('id, code, title, discount_type, discount_value, usage_limit, usage_count, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CouponRow[]
}

export default async function CouponsPage() {
  const initialItems = await getCoupons()
  return <CouponsClient initialItems={initialItems} />
}
