import { ProductForm } from '@/components/product-form'

export default async function EditProductBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="p-8">
      <ProductForm productSlug={slug} />
    </div>
  )
}
