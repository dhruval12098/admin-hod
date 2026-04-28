import { ProductForm } from '@/components/product-form'

export default function CreateProductPage() {
  return (
    <div className="p-8">
      <ProductForm
        forcedLane="standard"
        forcedTemplate="standard"
        backHref="/dashboard/products"
        pageTitle="Create Product"
        pageDescription="Add a standard storefront product using the main product flow."
      />
    </div>
  )
}
