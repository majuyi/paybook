'use client'

import { useCallback, useEffect, useState } from 'react'
import { useStaffMode } from '@/lib/staff-mode/context'
import { RoleGuard } from '@/lib/staff-mode/role-guard'
import {
  completeReconciliationAction,
  getReconciliation,
  type ReconRow,
} from './actions'

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 })

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function prettyDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function ReconciliationView({ initialDate }: { initialDate: string }) {
  const { active } = useStaffMode()
  const [date, setDate] = useState(initialDate)
  const [rows, setRows] = useState<ReconRow[]>([])
  const [tolerance, setTolerance] = useState(50)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await getReconciliation(active?.id ?? null, date)
    if (res.error) setError(res.error)
    else {
      setError(null)
      setRows(res.rows)
      if (res.tolerance != null) setTolerance(res.tolerance)
    }
    setLoading(false)
  }, [active?.id, date])

  useEffect(() => {
    let cancelled = false
    getReconciliation(active?.id ?? null, date).then((res) => {
      if (cancelled) return
      if (res.error) setError(res.error)
      else {
        setError(null)
        setRows(res.rows)
        if (res.tolerance != null) setTolerance(res.tolerance)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [active?.id, date])

  return (
    <RoleGuard allow={['owner', 'manager']}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-neutral-900">
            {prettyDate(date)}
          </span>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            disabled={date >= initialDate}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No cashiers logged sales on this day.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <ReconCashierCard
                key={row.cashierId}
                row={row}
                date={date}
                tolerance={tolerance}
                onDone={load}
              />
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}

function ReconCashierCard({
  row,
  date,
  tolerance,
  onDone,
}: {
  row: ReconRow
  date: string
  tolerance: number
  onDone: () => void
}) {
  const { active } = useStaffMode()
  const [actual, setActual] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete() {
    setError(null)
    setPending(true)
    const res = await completeReconciliationAction(
      active?.id ?? null,
      row.cashierId,
      date,
      Number(actual),
    )
    setPending(false)
    if (res.error) {
      setError(res.error)
      return
    }
    await onDone()
  }

  return (
    <div
      className={
        'rounded-xl border bg-white p-4 shadow-sm ' +
        (row.flagged ? 'border-red-300' : 'border-neutral-200')
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900">
          {row.cashierName}
        </span>
        <span className="text-xs text-neutral-500">
          {row.salesCount} sale{row.salesCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-neutral-500 sm:grid-cols-4">
        <span>Cash {naira(row.cashTotal)}</span>
        <span>Transfer {naira(row.transferTotal)}</span>
        <span>POS {naira(row.posTotal)}</span>
        <span>Credit {naira(row.creditTotal)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className="text-sm text-neutral-600">
          Expected cash{' '}
          <span className="font-semibold text-neutral-900">
            {naira(row.expected)}
          </span>
        </span>
      </div>

      {row.completed ? (
        <div className="mt-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-600">
              Counted{' '}
              <span className="font-medium text-neutral-900">
                {naira(row.actual ?? 0)}
              </span>
            </span>
            <span
              className={
                'rounded-full px-2 py-0.5 text-xs font-medium ' +
                (row.flagged
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700')
              }
            >
              {(row.discrepancy ?? 0) === 0
                ? 'Balanced'
                : `${(row.discrepancy ?? 0) > 0 ? 'Over' : 'Short'} ${naira(
                    Math.abs(row.discrepancy ?? 0),
                  )}`}
              {row.flagged ? ' · flagged' : ''}
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            Completed by {row.completedByName ?? 'Unknown'} · locked
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder="Cash counted"
            className="w-36 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
          <button
            onClick={complete}
            disabled={pending || actual.trim() === ''}
            className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Complete'}
          </button>
          {actual.trim() !== '' && (
            <span className="text-xs text-neutral-500">
              Discrepancy {naira(Number(actual) - row.expected)} (tolerance ±
              {naira(tolerance)})
            </span>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}
    </div>
  )
}
