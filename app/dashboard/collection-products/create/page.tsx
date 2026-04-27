import { ProductForm } from '@/components/product-form'

export default function CreateCollectionProductPage() {
  return (
    <div className="p-8">
      <ProductForm
        forcedLane="collection"
        backHref="/dashboard/collection-products"
        pageTitle="Create Collection Product"
        pageDescription="Add a collection-only product using the shared product form with collection rules applied."
      />
    </div>
  )
}
