import { notFound } from 'next/navigation'
import { ProductImportDetailClient } from './product-import-detail-client'
import { getImportJobDetail } from '@/lib/import-jobs'

export default async function ProductImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getImportJobDetail(id)

  if (!detail.job) {
    notFound()
  }

  return <ProductImportDetailClient detail={detail} />
}
