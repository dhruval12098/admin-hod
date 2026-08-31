import { notFound } from 'next/navigation'
import { CouponEditor } from '../../coupon-editor'
import { getCoupon, getCouponProducts } from '../../coupon-data'
export default async function EditCouponPage({ params }: { params: Promise<{ id:string }> }) { const {id}=await params; const number=Number(id); if(!Number.isInteger(number)||number<1) notFound(); const [coupon,products]=await Promise.all([getCoupon(number),getCouponProducts()]); if(!coupon) notFound(); return <CouponEditor coupon={coupon} products={products}/> }
