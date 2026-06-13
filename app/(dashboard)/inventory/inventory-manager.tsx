'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaffMode } from '@/lib/staff-mode/context'
import type { ProductListItem } from '@/lib/queries/products'
import { setProductActive } from './actions'
import { ProductForm } from './product-form'
import { AdjustStockForm } from './adjust-stock-form'
import { BulkAdd } from './bulk-add'

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 })

type EditState = { mode: 'create' | 'edit'; productId?: string } | null

export function InventoryManager({
  products,
}: {
  products: ProductListItem[]
}) {
  const router = useRouter()
  const { active, role } = useStaffMode()
  const canManage = role === 'owner' || role === 'manager'

  const [edit, setEdit] = useState<EditState>(null)
  const [bulk, setBulk] = useState(false)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  // Cashier: read-only list, name + price only (FRD §6.3 / §7.1).
  if (!canManage) {
    const visible = products.filter((p) => p.is_active)
    return (
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {visible.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="text-neutral-900">{p.name}</span>
            <span className="font-medium text-neutral-900">
              {naira(p.sell_price)}
            </span>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-4 py-3 text-sm text-neutral-500">No products.</li>
        )}
      </ul>
    )
  }

  async function toggleActive(productId: string, nextActive: boolean) {
    await setProductActive(active?.id ?? null, productId, nextActive)
    router.refresh()
  }

  const activeProducts = products.filter((p) => p.is_active)
  const inactiveProducts = products.filter((p) => !p.is_active)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setEdit({ mode: 'create' })}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Add product
        </button>
        <button
          onClick={() => setBulk((v) => !v)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {bulk ? 'Close bulk add' : 'Bulk add'}
        </button>
      </div>

      {bulk && <BulkAdd onClose={() => setBulk(false)} />}

      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {activeProducts.map((p) => {
          const out = p.stock_qty === 0
          const low = !out && p.stock_qty <= p.low_stock_threshold
          return (
            <li
              key={p.id}
              className={
                out ? 'bg-red-50 p-4' : low ? 'bg-amber-50 p-4' : 'p-4'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {p.name}
                    </span>
                    {p.category && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                        {p.category}
                      </span>
                    )}
                    {out && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Out of stock
                      </span>
                    )}
                    {low && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Low stock
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">
                    {naira(p.sell_price)} ·{' '}
                    <span className={out || low ? 'font-medium' : ''}>
                      {p.stock_qty} in stock
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <button
                    onClick={() => setEdit({ mode: 'edit', productId: p.id })}
                    className="text-neutral-600 hover:text-neutral-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      setAdjustingId(adjustingId === p.id ? null : p.id)
                    }
                    className="text-neutral-600 hover:text-neutral-900"
                  >
                    Adjust stock
                  </button>
                  <button
                    onClick={() => toggleActive(p.id, false)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
              {adjustingId === p.id && (
                <AdjustStockForm
                  productId={p.id}
                  currentQty={p.stock_qty}
                  onClose={() => setAdjustingId(null)}
                />
              )}
            </li>
          )
        })}
        {activeProducts.length === 0 && (
          <li className="px-4 py-3 text-sm text-neutral-500">
            No active products yet. Add your first one above.
          </li>
        )}
      </ul>

      {inactiveProducts.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Deactivated
          </h3>
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {inactiveProducts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-neutral-500">{p.name}</span>
                <button
                  onClick={() => toggleActive(p.id, true)}
                  className="text-xs text-green-700 hover:text-green-800"
                >
                  Reactivate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {edit && (
        <ProductForm
          mode={edit.mode}
          productId={edit.productId}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  )
}
