'use client'

import Link from 'next/link'
import { useStaffMode } from '@/lib/staff-mode/context'

const card =
  'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300'

export function QuickLinks() {
  const { role } = useStaffMode()

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link href="/sales/new" className={card}>
        <div className="text-sm font-medium text-neutral-900">New sale</div>
        <div className="mt-0.5 text-sm text-neutral-500">
          Ring up a sale and record the payment.
        </div>
      </Link>
      <Link href="/sales" className={card}>
        <div className="text-sm font-medium text-neutral-900">Sales</div>
        <div className="mt-0.5 text-sm text-neutral-500">
          Review recent transactions.
        </div>
      </Link>
      <Link href="/inventory" className={card}>
        <div className="text-sm font-medium text-neutral-900">Inventory</div>
        <div className="mt-0.5 text-sm text-neutral-500">
          Products, prices, and stock levels.
        </div>
      </Link>
      {(role === 'owner' || role === 'manager') && (
        <Link href="/reconciliation" className={card}>
          <div className="text-sm font-medium text-neutral-900">
            Reconciliation
          </div>
          <div className="mt-0.5 text-sm text-neutral-500">
            Balance each cashier&apos;s drawer at end of day.
          </div>
        </Link>
      )}
      {role === 'owner' && (
        <Link href="/staff" className={card}>
          <div className="text-sm font-medium text-neutral-900">Staff</div>
          <div className="mt-0.5 text-sm text-neutral-500">
            Manage cashiers and managers, PINs, and access.
          </div>
        </Link>
      )}
    </div>
  )
}
