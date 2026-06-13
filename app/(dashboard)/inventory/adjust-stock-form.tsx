'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaffMode } from '@/lib/staff-mode/context'
import { adjustStock } from './actions'

export function AdjustStockForm({
  productId,
  currentQty,
  onClose,
}: {
  productId: string
  currentQty: number
  onClose: () => void
}) {
  const router = useRouter()
  const { active } = useStaffMode()
  const [newQty, setNewQty] = useState(String(currentQty))
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await adjustStock(
      active?.id ?? null,
      productId,
      Number(newQty),
      reason,
    )
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-neutral-600">
            New quantity
          </span>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            className="mt-1 w-28 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </label>
        <label className="block flex-1">
          <span className="text-xs font-medium text-neutral-600">
            Reason (restock, damage, correction…)
          </span>
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Restocked 2 cartons"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {currentQty} → {newQty || '0'}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save adjustment'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
