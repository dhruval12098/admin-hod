import { ProductForm } from '@/components/product-form'

export default async function EditHipHopProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="p-8">
      <ProductForm
        productSlug={slug}
        forcedLane="hiphop"
        forcedTemplate="hiphop"
        backHref="/dashboard/hiphop-products"
        pageTitle="Edit Hip Hop Product"
        pageDescription="Update the saved Hip Hop product model and storefront details."
      />
    </div>
  )
}
