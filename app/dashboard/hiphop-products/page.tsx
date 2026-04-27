import { ProductsClient } from '../products/products-client'
import { getProductRows } from '../products/product-list'

export default async function HipHopProductsPage() {
  const initialProducts = await getProductRows('hiphop')

  return (
    <ProductsClient
      initialProducts={initialProducts}
      lane="hiphop"
      title="Hip Hop Products"
      description="Create and manage premium Hip Hop products with the dedicated template flow."
      createHref="/dashboard/hiphop-products/create"
      createLabel="Add Hip Hop Product"
      editBaseHref="/dashboard/hiphop-products/edit"
      emptyMessage="No Hip Hop products found."
    />
  )
}
