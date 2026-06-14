import Link from 'next/link'
import { requireOwner } from '@/lib/auth'
import { SalesHistory } from './sales-history'

export default async function SalesPage() {
  await requireOwner()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Sales</h1>
          <p className="mt-1 text-sm text-neutral-500">Recent transactions.</p>
        </div>
        <Link
          href="/sales/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          New sale
        </Link>
      </div>
      <SalesHistory />
    </div>
  )
}
