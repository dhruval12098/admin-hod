import { ProductImportWizardClient } from './product-import-wizard-client'
import { getProductImportTemplateColumns } from '@/lib/product-import-templates'

export default function NewProductImportPage() {
  const columns = getProductImportTemplateColumns()

  return <ProductImportWizardClient columns={columns} />
}

