'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaffMode } from '@/lib/staff-mode/context'
import { bulkCreateProducts } from './actions'

type Row = { name: string; sellPrice: string; stockQty: string }
const blankRow = (): Row => ({ name: '', sellPrice: '', stockQty: '0' })

const cell =
  'w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'

export function BulkAdd({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { active } = useStaffMode()
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow(), blankRow()])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(i: number, key: keyof Row, value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const filled = rows.filter((r) => r.name.trim() !== '')
    if (filled.length === 0) {
      setError('Add at least one product.')
      return
    }
    setPending(true)
    const result = await bulkCreateProducts(
      active?.id ?? null,
      filled.map((r) => ({
        name: r.name,
        category: '',
        sellPrice: Number(r.sellPrice || '0'),
        costPrice: null,
        stockQty: Number(r.stockQty || '0'),
        lowStockThreshold: 5,
      })),
    )
    setPending(false)
    if (result.error) {
      setError(`${result.error} (${result.created} added before the error)`)
      router.refresh()
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-2 grid grid-cols-[1fr_7rem_6rem] gap-2 text-xs font-medium text-neutral-500">
        <span>Name</span>
        <span>Sell price (₦)</span>
        <span>Stock</span>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem_6rem] gap-2">
            <input
              value={r.name}
              onChange={(e) => update(i, 'name', e.target.value)}
              placeholder="Product name"
              className={cell}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={r.sellPrice}
              onChange={(e) => update(i, 'sellPrice', e.target.value)}
              className={cell}
            />
            <input
              type="number"
              min="0"
              step="1"
              value={r.stockQty}
              onChange={(e) => update(i, 'stockQty', e.target.value)}
              className={cell}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, blankRow()])}
        className="mt-3 text-sm text-neutral-600 hover:text-neutral-900"
      >
        + Add row
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add all'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
