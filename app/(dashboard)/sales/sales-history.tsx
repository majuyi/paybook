'use client'

import { useCallback, useEffect, useState } from 'react'
import { useStaffMode } from '@/lib/staff-mode/context'
import {
  getSales,
  softDeleteSaleAction,
  type SaleListItem,
} from './actions'

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 })

const paymentLabel: Record<string, string> = {
  cash: 'Cash',
  transfer: 'Transfer',
  pos: 'POS',
  credit: 'Credit',
}

function when(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SalesHistory() {
  const { active, role } = useStaffMode()
  const [sales, setSales] = useState<SaleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await getSales(active?.id ?? null)
    if (res.error) setError(res.error)
    else setSales(res.sales)
    setLoading(false)
  }, [active?.id])

  useEffect(() => {
    let cancelled = false
    getSales(active?.id ?? null).then((res) => {
      if (cancelled) return
      if (res.error) setError(res.error)
      else setSales(res.sales)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [active?.id])

  async function doDelete(saleId: string) {
    setActionError(null)
    const res = await softDeleteSaleAction(active?.id ?? null, saleId, reason)
    if (res.error) {
      setActionError(res.error)
      return
    }
    setDeletingId(null)
    setReason('')
    await load()
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (sales.length === 0)
    return <p className="text-sm text-neutral-500">No sales yet.</p>

  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {sales.map((s) => (
        <li
          key={s.id}
          className={s.isDeleted ? 'bg-neutral-50 p-4' : 'p-4'}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">
                  {naira(s.total)}
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {paymentLabel[s.paymentMethod] ?? s.paymentMethod}
                </span>
                {s.isDeleted && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Deleted
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {when(s.soldAt)} · {s.cashierName}
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                {s.items
                  .map((i) => `${i.quantity}× ${i.name}`)
                  .join(', ')}
              </div>
              {s.isDeleted && s.deletedReason && (
                <div className="mt-1 text-xs text-red-600">
                  Reason: {s.deletedReason}
                </div>
              )}
            </div>

            {role === 'owner' && !s.isDeleted && (
              <button
                onClick={() => {
                  setDeletingId(deletingId === s.id ? null : s.id)
                  setReason('')
                  setActionError(null)
                }}
                className="shrink-0 text-xs text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>

          {deletingId === s.id && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
                placeholder="Reason for deleting (required)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
              <button
                onClick={() => doDelete(s.id)}
                disabled={!reason.trim()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm delete
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Cancel
              </button>
              {actionError && (
                <span className="text-xs text-red-600">{actionError}</span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
