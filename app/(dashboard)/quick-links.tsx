'use client'

import Link from 'next/link'
import { useStaffMode } from '@/lib/staff-mode/context'

const card =
  'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300'

export function QuickLinks() {
  const { role } = useStaffMode()

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link href="/inventory" className={card}>
        <div className="text-sm font-medium text-neutral-900">Inventory</div>
        <div className="mt-0.5 text-sm text-neutral-500">
          Products, prices, and stock levels.
        </div>
      </Link>
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
