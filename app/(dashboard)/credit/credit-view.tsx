'use client'

import { useCallback, useEffect, useState } from 'react'
import { useStaffMode } from '@/lib/staff-mode/context'
import { RoleGuard } from '@/lib/staff-mode/role-guard'
import { creditReminderMessage, waMeLink } from '@/lib/whatsapp'
import {
  getCredits,
  getCreditTransactions,
  recordPaymentAction,
  type CreditItem,
  type CreditTxn,
} from './actions'

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function CreditView() {
  const { active } = useStaffMode()
  const [credits, setCredits] = useState<CreditItem[]>([])
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await getCredits(active?.id ?? null)
    if (res.error) setError(res.error)
    else {
      setError(null)
      setCredits(res.credits)
      setShopName(res.shopName ?? '')
    }
    setLoading(false)
  }, [active?.id])

  useEffect(() => {
    let cancelled = false
    getCredits(active?.id ?? null).then((res) => {
      if (cancelled) return
      if (res.error) setError(res.error)
      else {
        setError(null)
        setCredits(res.credits)
        setShopName(res.shopName ?? '')
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [active?.id])

  const outstanding = credits.filter((c) => !c.isSettled)
  const settled = credits.filter((c) => c.isSettled)
  const totalOwed = outstanding.reduce((s, c) => s + c.amountOwed, 0)

  return (
    <RoleGuard allow={['owner', 'manager']}>
      <div className="space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : (
          <>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm">
              <span className="text-neutral-500">
                {outstanding.length} customer
                {outstanding.length === 1 ? '' : 's'} owe{' '}
              </span>
              <span className="font-semibold text-neutral-900">
                {naira(totalOwed)}
              </span>
            </div>

            {outstanding.length === 0 ? (
              <p className="text-sm text-neutral-500">No outstanding credit.</p>
            ) : (
              <div className="space-y-3">
                {outstanding.map((c) => (
                  <CreditCard
                    key={c.id}
                    credit={c}
                    shopName={shopName}
                    onChanged={load}
                  />
                ))}
              </div>
            )}

            {settled.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Settled
                </h3>
                <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  {settled.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span className="text-neutral-600">{c.customerName}</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Settled
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  )
}

function CreditCard({
  credit,
  shopName,
  onChanged,
}: {
  credit: CreditItem
  shopName: string
  onChanged: () => void
}) {
  const { active } = useStaffMode()
  const [amount, setAmount] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txns, setTxns] = useState<CreditTxn[] | null>(null)
  const [showTxns, setShowTxns] = useState(false)

  async function pay() {
    setError(null)
    setPending(true)
    const res = await recordPaymentAction(
      active?.id ?? null,
      credit.id,
      Number(amount),
    )
    setPending(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setAmount('')
    await onChanged()
  }

  async function toggleTxns() {
    if (!showTxns && txns === null) {
      const res = await getCreditTransactions(active?.id ?? null, credit.id)
      setTxns(res.transactions)
    }
    setShowTxns((v) => !v)
  }

  const reminder = creditReminderMessage(
    credit.customerName,
    shopName,
    credit.amountOwed.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
  )

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-neutral-900">
            {credit.customerName}
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">
            {credit.customerPhone ?? 'No phone'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-neutral-900">
            {naira(credit.amountOwed)}
          </div>
          <div className="text-xs text-neutral-400">owed</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Payment amount"
          className="w-36 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
        <button
          onClick={pay}
          disabled={pending || amount.trim() === ''}
          className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Record payment'}
        </button>

        {credit.customerPhone ? (
          <a
            href={waMeLink(credit.customerPhone, reminder)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Send reminder
          </a>
        ) : (
          <button
            disabled
            title="Add customer phone to send reminder."
            className="cursor-not-allowed rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-400"
          >
            Send reminder
          </button>
        )}

        <button
          onClick={toggleTxns}
          className="text-xs text-neutral-500 hover:text-neutral-800"
        >
          {showTxns ? 'Hide history' : 'History'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {showTxns && txns && (
        <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2 text-xs">
          {txns.map((t) => (
            <li key={t.id} className="flex justify-between text-neutral-600">
              <span>
                {t.type === 'charge' ? 'Charge' : 'Payment'} · {t.recordedByName}
              </span>
              <span
                className={t.type === 'payment' ? 'text-green-700' : 'text-neutral-900'}
              >
                {t.type === 'payment' ? '−' : '+'}
                {naira(t.amount)}
              </span>
            </li>
          ))}
          {txns.length === 0 && (
            <li className="text-neutral-400">No transactions.</li>
          )}
        </ul>
      )}
    </div>
  )
}
