import { ProductForm } from '@/components/product-form'
import { getProductFormBasicsBootstrap } from '../../product-form-bootstrap'

export default async function EditProductBySlugPage({
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
        forcedLane="standard"
        forcedTemplate="standard"
        backHref="/dashboard/products"
        pageTitle="Edit Product"
        pageDescription="Update the saved standard product and storefront details."
        initialBasicsBootstrap={initialBasicsBootstrap}
      />
    </div>
  )
}
