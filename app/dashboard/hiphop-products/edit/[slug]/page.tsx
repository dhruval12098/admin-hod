import { ProductForm } from '@/components/product-form'
import { getProductFormBasicsBootstrap } from '../../../products/product-form-bootstrap'

export default async function EditHipHopProductPage({
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
        forcedLane="hiphop"
        forcedTemplate="hiphop"
        backHref="/dashboard/hiphop-products"
        pageTitle="Edit Hip Hop Product"
        pageDescription="Update the saved Hip Hop product model and storefront details."
        initialBasicsBootstrap={initialBasicsBootstrap}
      />
    </div>
  )
}
