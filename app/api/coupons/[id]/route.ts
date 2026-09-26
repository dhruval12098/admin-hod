import { assertAdmin } from '@/lib/cms-auth'
import { deleteCoupon } from '@/lib/coupon-save'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await assertAdmin(request)
  if ('error' in access) return access.error
  const { id } = await params
  return deleteCoupon(access, id)
}
