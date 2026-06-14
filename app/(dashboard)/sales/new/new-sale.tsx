'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStaffMode } from '@/lib/staff-mode/context'
import type { SellableProduct } from '@/lib/queries/products'
import { createSaleAction, type PaymentMethod } from '../actions'

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 })

type Line = { product: SellableProduct; qty: number }

const PAYMENTS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'pos', label: 'POS' },
  { value: 'credit', label: 'Credit' },
]

export function NewSale({ products }: { products: SellableProduct[] }) {
  const router = useRouter()
  const { active } = useStaffMode()

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Map<string, Line>>(new Map())
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q))
      : products
    return list.slice(0, 30)
  }, [search, products])

  const lines = [...cart.values()]
  const total = lines.reduce((sum, l) => sum + l.product.sell_price * l.qty, 0)

  function addToCart(product: SellableProduct) {
    setDone(null)
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(product.id)
      const qty = Math.min((existing?.qty ?? 0) + 1, product.stock_qty)
      next.set(product.id, { product, qty })
      return next
    })
  }

  function setQty(productId: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev)
      const line = next.get(productId)
      if (!line) return next
      const clamped = Math.max(1, Math.min(qty, line.product.stock_qty))
      next.set(productId, { ...line, qty: clamped })
      return next
    })
  }

  function removeLine(productId: string) {
    setCart((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }

  async function confirm() {
    setError(null)
    if (lines.length === 0) {
      setError('Add at least one product.')
      return
    }
    if (payment === 'credit' && !customerName.trim()) {
      setError('Customer name is required for a credit sale.')
      return
    }
    setPending(true)
    const result = await createSaleAction(active?.id ?? null, {
      paymentMethod: payment,
      items: lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
      customerName: payment === 'credit' ? customerName : undefined,
      customerPhone: payment === 'credit' ? customerPhone : undefined,
    })
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDone(total)
    setCart(new Map())
    setCustomerName('')
    setCustomerPhone('')
    setPayment('cash')
    router.refresh() // refresh sellable stock for the next sale
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {/* Product picker */}
      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {results.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => addToCart(p)}
                className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:border-neutral-300"
              >
                <div className="text-sm font-medium text-neutral-900">
                  {p.name}
                </div>
                <div className="mt-0.5 flex justify-between text-xs text-neutral-500">
                  <span>{naira(p.sell_price)}</span>
                  <span>{p.stock_qty} in stock</span>
                </div>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="text-sm text-neutral-500">
              No products available to sell.
            </li>
          )}
        </ul>
      </div>

      {/* Cart / checkout */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Current sale</h2>

        {done !== null && (
          <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            Sale recorded — {naira(done)}.{' '}
            <Link href="/sales" className="underline">
              View sales
            </Link>
          </div>
        )}

        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No items yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lines.map((l) => (
              <li key={l.product.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-900">
                    {l.product.name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {naira(l.product.sell_price)} each
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQty(l.product.id, l.qty - 1)}
                    className="h-7 w-7 rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={l.product.stock_qty}
                    value={l.qty}
                    onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                    className="h-7 w-12 rounded-lg border border-neutral-300 text-center text-sm outline-none"
                  />
                  <button
                    onClick={() => setQty(l.product.id, l.qty + 1)}
                    disabled={l.qty >= l.product.stock_qty}
                    className="h-7 w-7 rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <div className="w-16 text-right text-sm font-medium text-neutral-900">
                  {naira(l.product.sell_price * l.qty)}
                </div>
                <button
                  onClick={() => removeLine(l.product.id)}
                  className="text-xs text-neutral-400 hover:text-red-600"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3">
          <span className="text-sm text-neutral-600">Total</span>
          <span className="text-lg font-semibold text-neutral-900">
            {naira(total)}
          </span>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-neutral-600">Payment</span>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {PAYMENTS.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setPayment(pm.value)}
                className={
                  'rounded-lg border px-2 py-1.5 text-xs font-medium ' +
                  (payment === pm.value
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50')
                }
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {payment === 'credit' && (
          <div className="mt-3 space-y-2">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="Customer name (required)"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              type="tel"
              placeholder="Phone (recommended for reminders)"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={confirm}
          disabled={pending || lines.length === 0}
          className="mt-4 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? 'Recording…' : `Confirm sale · ${naira(total)}`}
        </button>
      </div>
    </div>
  )
}
