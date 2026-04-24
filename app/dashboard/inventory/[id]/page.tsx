import { ProductForm } from '@/components/product-form'

export default function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="p-8">
      <ProductForm productId={parseInt(params.id)} />
    </div>
  )
}
