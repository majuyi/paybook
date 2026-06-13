import Link from 'next/link'
import { requireOwner } from '@/lib/auth'

export default async function DashboardPage() {
  const { shop } = await requireOwner()

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">{shop.name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Welcome back. Your dashboard modules land here as we build them.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/staff"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300"
        >
          <div className="text-sm font-medium text-neutral-900">Staff</div>
          <div className="mt-0.5 text-sm text-neutral-500">
            Manage cashiers and managers, PINs, and access.
          </div>
        </Link>
      </div>
    </div>
  )
}
