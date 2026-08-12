import { ProductForm } from '@/components/product-form'
import { getProductFormBasicsBootstrap } from '../../../products/product-form-bootstrap'

export default async function EditCollectionProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const initialBasicsBootstrap = await getProductFormBasicsBootstrap()

  return (
    <div className="p-8">
      <ProductForm
        productSlug={slug}
        forcedLane="collection"
        backHref="/dashboard/collection-products"
        pageTitle="Edit Collection Product"
        pageDescription="Update the saved collection product while keeping collection rules applied."
        initialBasicsBootstrap={initialBasicsBootstrap}
      />
    </div>
  )
}
