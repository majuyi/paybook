'use client'

import { RoleGuard } from '@/lib/staff-mode/role-guard'

export function SettingsContent() {
  return (
    <RoleGuard allow={['owner']}>
      <div className="space-y-6">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-neutral-900">Data export</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Download all your shop data as a ZIP of CSV files — sales, items,
            products, staff, customer credit, transactions, and reconciliations.
            Always available.
          </p>
          <a
            href="/api/export"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Export data (ZIP)
          </a>
        </section>
      </div>
    </RoleGuard>
  )
}
