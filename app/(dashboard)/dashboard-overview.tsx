'use client'

import { useStaffMode } from '@/lib/staff-mode/context'
import type { BriefingData } from '@/lib/briefing'

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const card = 'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={card}>
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-neutral-500">{hint}</div>}
    </div>
  )
}

const cashTone: Record<string, string> = {
  Reconciled: 'text-green-700',
  Pending: 'text-amber-700',
  'Not started': 'text-neutral-500',
}

/**
 * The home "today" overview — the same six figures as the WhatsApp briefing
 * (lib/briefing.ts), live. Financial figures (revenue, profit, credit, cash
 * status) are owner/manager only; a cashier sees just the operational ones.
 * Gating is display-layer, mirroring QuickLinks — the figures are fetched once
 * server-side under the owner session.
 */
export function DashboardOverview({ data }: { data: BriefingData }) {
  const { role } = useStaffMode()
  const privileged = role === 'owner' || role === 'manager'

  return (
    <div className="mt-6">
      <h2 className="text-sm font-medium text-neutral-900">Today so far</h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {privileged && <Stat label="Revenue" value={naira(data.totalRevenue)} />}
        {privileged && (
          <Stat label="Est. profit" value={naira(data.estimatedProfit)} />
        )}
        <Stat
          label="Sales"
          value={String(data.saleCount)}
          hint={data.saleCount === 1 ? 'transaction' : 'transactions'}
        />
        {privileged && (
          <div className={card}>
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Cash status
            </div>
            <div
              className={`mt-1 text-2xl font-semibold ${
                cashTone[data.cashStatus] ?? 'text-neutral-900'
              }`}
            >
              {data.cashStatus}
            </div>
          </div>
        )}
        {privileged && (
          <Stat
            label="Outstanding credit"
            value={naira(data.creditTotal)}
            hint={
              data.creditCount === 1
                ? '1 customer owes'
                : `${data.creditCount} customers owe`
            }
          />
        )}
      </div>

      <div className={`mt-3 ${card}`}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Low stock
          </div>
          {data.lowStockMore > 0 && (
            <div className="text-xs text-neutral-500">+{data.lowStockMore} more</div>
          )}
        </div>
        {data.lowStock.length === 0 ? (
          <div className="mt-2 text-sm text-neutral-500">
            Nothing running low. 👍
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-100">
            {data.lowStock.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-neutral-900">{item.name}</span>
                <span className="font-medium text-amber-700">{item.qty} left</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
