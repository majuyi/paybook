import { requireOwner } from '@/lib/auth'
import { listProducts } from '@/lib/queries/products'
import { InventoryManager } from './inventory-manager'

export default async function InventoryPage() {
  const { shop } = await requireOwner()
  const products = await listProducts(shop.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Inventory</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Products, prices, and stock levels.
        </p>
      </div>
      <InventoryManager products={products} />
    </div>
  )
}
