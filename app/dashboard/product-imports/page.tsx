import { ProductImportsClient } from './product-imports-client'
import { getImportJobsOverview } from '@/lib/import-jobs'

export default async function ProductImportsPage() {
  const overview = await getImportJobsOverview()

  return <ProductImportsClient overview={overview} />
}

