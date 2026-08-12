import { ProductForm } from '@/components/product-form'
import { getProductFormBasicsBootstrap } from '../../products/product-form-bootstrap'

export default async function CreateHipHopProductPage() {
  const initialBasicsBootstrap = await getProductFormBasicsBootstrap()

  return (
    <div className="p-8">
      <ProductForm
        forcedLane="hiphop"
        forcedTemplate="hiphop"
        forceHipHopCategory
        backHref="/dashboard/hiphop-products"
        pageTitle="Create Hip Hop Product"
        pageDescription="Add a premium Hip Hop product using the dedicated template flow."
        initialBasicsBootstrap={initialBasicsBootstrap}
      />
    </div>
  )
}
