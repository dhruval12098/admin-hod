import { ProductForm } from '@/components/product-form'

export default function CreateHipHopProductPage() {
  return (
    <div className="p-8">
      <ProductForm
        forcedTemplate="hiphop"
        forceHipHopCategory
        backHref="/dashboard/hiphop-products"
        pageTitle="Create Hip Hop Product"
        pageDescription="Add a premium Hip Hop product using the dedicated template flow."
      />
    </div>
  )
}
