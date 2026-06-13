'use client'

import { useState } from 'react'
import type { StaffListItem } from '@/lib/queries/staff'
import { setStaffActiveAction } from './actions'
import { ResetPinForm } from './reset-pin-form'

const roleLabel: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
}

export function StaffList({ staff }: { staff: StaffListItem[] }) {
  const [resettingId, setResettingId] = useState<string | null>(null)

  if (staff.length === 0) {
    return <p className="text-sm text-neutral-500">No staff yet.</p>
  }

  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {staff.map((s) => {
        const isOwner = s.role === 'owner'
        return (
          <li key={s.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-neutral-900">
                    {s.name}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {roleLabel[s.role] ?? s.role}
                  </span>
                  {!s.is_active && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                      Deactivated
                    </span>
                  )}
                </div>
                {s.phone && (
                  <div className="mt-0.5 text-xs text-neutral-500">{s.phone}</div>
                )}
              </div>

              {!isOwner && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setResettingId(resettingId === s.id ? null : s.id)
                    }
                    className="text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    Reset PIN
                  </button>
                  <form action={setStaffActiveAction}>
                    <input type="hidden" name="staff_id" value={s.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={(!s.is_active).toString()}
                    />
                    <button
                      type="submit"
                      className={
                        s.is_active
                          ? 'text-xs text-red-600 hover:text-red-700'
                          : 'text-xs text-green-700 hover:text-green-800'
                      }
                    >
                      {s.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {resettingId === s.id && (
              <ResetPinForm staffId={s.id} onDone={() => setResettingId(null)} />
            )}
          </li>
        )
      })}
    </ul>
  )
}
