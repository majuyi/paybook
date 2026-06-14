import { requireOwner } from '@/lib/auth'
import { listSellableProducts } from '@/lib/queries/products'
import { NewSale } from './new-sale'

export default async function NewSalePage() {
  const { shop } = await requireOwner()
  const products = await listSellableProducts(shop.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">New sale</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Add products, choose how the customer paid, and confirm.
        </p>
      </div>
      <NewSale products={products} />
    </div>
  )
}
