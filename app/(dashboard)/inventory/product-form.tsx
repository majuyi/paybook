'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaffMode } from '@/lib/staff-mode/context'
import { createProduct, getProductForEdit, updateProduct } from './actions'

const inputClass =
  'mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

type FormState = {
  name: string
  category: string
  sellPrice: string
  costPrice: string
  stockQty: string
  lowStockThreshold: string
}

const empty: FormState = {
  name: '',
  category: '',
  sellPrice: '',
  costPrice: '',
  stockQty: '0',
  lowStockThreshold: '5',
}

export function ProductForm({
  mode,
  productId,
  onClose,
}: {
  mode: 'create' | 'edit'
  productId?: string
  onClose: () => void
}) {
  const router = useRouter()
  const { active, role } = useStaffMode()
  const [form, setForm] = useState<FormState>(empty)
  const [canEditCost, setCanEditCost] = useState(role === 'owner')
  const [loading, setLoading] = useState(mode === 'edit')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || !productId) return
    let cancelled = false
    getProductForEdit(active?.id ?? null, productId).then((res) => {
      if (cancelled) return
      if (res.product) {
        const p = res.product
        setForm({
          name: p.name,
          category: p.category,
          sellPrice: String(p.sellPrice),
          costPrice: p.costPrice != null ? String(p.costPrice) : '',
          stockQty: '',
          lowStockThreshold: String(p.lowStockThreshold),
        })
        setCanEditCost(p.canEditCost)
      } else {
        setError(res.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [mode, productId, active?.id])

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const sellPrice = Number(form.sellPrice)
    const costPrice = form.costPrice.trim() === '' ? null : Number(form.costPrice)
    const lowStockThreshold = Number(form.lowStockThreshold || '5')

    const result =
      mode === 'create'
        ? await createProduct(active?.id ?? null, {
            name: form.name,
            category: form.category,
            sellPrice,
            costPrice,
            stockQty: Number(form.stockQty || '0'),
            lowStockThreshold,
          })
        : await updateProduct(active?.id ?? null, productId!, {
            name: form.name,
            category: form.category,
            sellPrice,
            costPrice,
            lowStockThreshold,
          })

    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-neutral-900">
          {mode === 'create' ? 'Add product' : 'Edit product'}
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-neutral-500">Loading…</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Name</span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">
                Category <span className="text-neutral-400">(optional)</span>
              </span>
              <input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={inputClass}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-neutral-700">
                  Sell price (₦)
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellPrice}
                  onChange={(e) => set('sellPrice', e.target.value)}
                  className={inputClass}
                />
              </label>
              {canEditCost && (
                <label className="block">
                  <span className="text-sm font-medium text-neutral-700">
                    Cost price (₦)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(e) => set('costPrice', e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mode === 'create' && (
                <label className="block">
                  <span className="text-sm font-medium text-neutral-700">
                    Opening stock
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stockQty}
                    onChange={(e) => set('stockQty', e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-medium text-neutral-700">
                  Low-stock alert at
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStockThreshold}
                  onChange={(e) => set('lowStockThreshold', e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            {mode === 'edit' && (
              <p className="text-xs text-neutral-400">
                Stock is changed from the product&apos;s Adjust stock action, not
                here.
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
