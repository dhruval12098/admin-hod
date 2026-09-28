import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProductPayload } from '@/lib/product-payload-validation'

type ProductSaveParams = {
  actorId: string
  productId?: string | null
  slug?: string | null
  payload: ProductPayload
}

export async function saveProductAtomically(adminClient: SupabaseClient, params: ProductSaveParams) {
  return adminClient.rpc('admin_product_save_v1', {
    p_actor_id: params.actorId,
    p_product_id: params.productId ?? null,
    p_slug: params.slug ?? null,
    p_payload: params.payload,
  })
}
